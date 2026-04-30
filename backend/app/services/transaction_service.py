from datetime import date, datetime, timezone

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.category_model import Category, Subcategory
from app.models.classification_log_model import ClassificationLog
from app.models.transaction_model import Transaction
from app.parsers.base import ParsedRow
from app.schemas.transaction_schema import TransactionCreate, TransactionUpdate
from app.services import category_service
from app.services.classification import get_classifier
from app.services.classification.category_tree import build_category_tree, build_category_type_map

# Whitelist of sortable fields to prevent SQL injection via sort_by param
SORTABLE_FIELDS = {
    "transaction_date": Transaction.transaction_date,
    "amount": Transaction.amount,
    "merchant_normalized": Transaction.merchant_normalized,
    "created_at": Transaction.created_at,
}

LOW_CONFIDENCE_THRESHOLD = 0.7


def _resolve_category_ids(
    db: Session,
    category_name: str | None,
    subcategory_name: str | None,
    ledger_id: int | None,
) -> tuple[int | None, int | None]:
    """Resolve category and subcategory names to their DB IDs within the given ledger."""
    if not category_name:
        return None, None

    cat = (
        db.query(Category)
        .filter(Category.name == category_name, Category.ledger_id == ledger_id)
        .first()
    )
    if not cat:
        return None, None

    if not subcategory_name:
        return cat.id, None

    sub = (
        db.query(Subcategory)
        .filter(Subcategory.category_id == cat.id, Subcategory.name == subcategory_name)
        .first()
    )
    return cat.id, (sub.id if sub else None)


def is_duplicate_transaction(
    db: Session,
    parsed: ParsedRow,
    ledger_id: int | None,
    source_name: str,
) -> int | None:
    """Return the ID of the matching original transaction, or None if not a duplicate."""
    q = db.query(Transaction).filter(
        Transaction.is_deleted == False,  # noqa: E712
        Transaction.ledger_id == ledger_id,
    )
    # Tier 1: exact external_id match
    if parsed.external_id:
        match = q.filter(Transaction.external_id == parsed.external_id).first()
        if match:
            return match.id
    # Tier 2: fuzzy — same amount, date, source, and description/merchant
    desc = parsed.description or parsed.merchant_raw
    if desc:
        match = q.filter(
            Transaction.amount == float(parsed.amount),
            Transaction.transaction_date == parsed.transaction_date,
            Transaction.source_name == source_name,
            or_(Transaction.description == desc, Transaction.merchant_raw == desc),
        ).first()
        if match:
            return match.id
    return None


def list_transactions(
    db: Session,
    search: str | None = None,
    category: str | None = None,
    source_type: str | None = None,
    needs_review: bool = False,
    is_duplicate: bool = False,
    sort_by: str = "transaction_date",
    sort_dir: str = "desc",
    page: int = 1,
    page_size: int = 50,
    date_from: date | None = None,
    date_to: date | None = None,
    ledger_id: int | None = None,
) -> tuple[list[Transaction], int]:
    query = db.query(Transaction).filter(Transaction.is_deleted == False)  # noqa: E712

    if ledger_id is not None:
        query = query.filter(Transaction.ledger_id == ledger_id)

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                Transaction.merchant_normalized.ilike(pattern),
                Transaction.description.ilike(pattern),
                Transaction.notes.ilike(pattern),
            )
        )

    if category:
        query = query.join(Category, Transaction.category_id == Category.id).filter(
            Category.name == category
        )

    if source_type:
        if source_type in ("csv", "manual"):
            query = query.filter(Transaction.source_type == source_type)
        else:
            query = query.filter(Transaction.source_name == source_type)

    if needs_review:
        query = query.filter(
            Transaction.classification_confidence.isnot(None),
            Transaction.classification_confidence < LOW_CONFIDENCE_THRESHOLD,
        )

    if is_duplicate:
        orig_id_q = (
            db.query(Transaction.duplicate_of_id)
            .filter(
                Transaction.is_duplicate == True,  # noqa: E712
                Transaction.is_deleted == False,  # noqa: E712
                Transaction.duplicate_of_id.isnot(None),
            )
        )
        if ledger_id is not None:
            orig_id_q = orig_id_q.filter(Transaction.ledger_id == ledger_id)
        orig_ids = [r[0] for r in orig_id_q.all() if r[0] is not None]
        if orig_ids:
            query = query.filter(
                or_(
                    Transaction.is_duplicate == True,  # noqa: E712
                    Transaction.id.in_(orig_ids),
                )
            )
        else:
            query = query.filter(Transaction.is_duplicate == True)  # noqa: E712

    if date_from:
        query = query.filter(Transaction.transaction_date >= date_from)
    if date_to:
        query = query.filter(Transaction.transaction_date <= date_to)

    # Get total count before pagination
    total = query.with_entities(func.count(Transaction.id)).scalar() or 0

    # Apply sort
    sort_column = SORTABLE_FIELDS.get(sort_by, Transaction.transaction_date)
    if sort_dir.lower() == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    # Pagination
    offset = (page - 1) * page_size
    items = query.offset(offset).limit(page_size).all()

    return items, total


def get_transaction_summary(
    db: Session,
    search: str | None = None,
    category: str | None = None,
    source_type: str | None = None,
    needs_review: bool = False,
    date_from: date | None = None,
    date_to: date | None = None,
    ledger_id: int | None = None,
) -> dict:
    query = db.query(Transaction).filter(Transaction.is_deleted == False)  # noqa: E712

    if ledger_id is not None:
        query = query.filter(Transaction.ledger_id == ledger_id)

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                Transaction.merchant_normalized.ilike(pattern),
                Transaction.description.ilike(pattern),
                Transaction.notes.ilike(pattern),
            )
        )
    if category:
        query = query.join(Category, Transaction.category_id == Category.id).filter(
            Category.name == category
        )
    if source_type:
        if source_type in ("csv", "manual"):
            query = query.filter(Transaction.source_type == source_type)
        else:
            query = query.filter(Transaction.source_name == source_type)
    if needs_review:
        query = query.filter(
            Transaction.classification_confidence.isnot(None),
            Transaction.classification_confidence < LOW_CONFIDENCE_THRESHOLD,
        )
    if date_from:
        query = query.filter(Transaction.transaction_date >= date_from)
    if date_to:
        query = query.filter(Transaction.transaction_date <= date_to)

    spending_query = query.filter(Transaction.transaction_type == "expense")

    expenses = spending_query.with_entities(
        func.sum(func.abs(Transaction.amount)).filter(Transaction.amount < 0)
    ).scalar() or 0
    refunds = spending_query.with_entities(
        func.sum(Transaction.amount).filter(Transaction.amount > 0)
    ).scalar() or 0
    total_spent = max(float(expenses) - float(refunds), 0)

    largest = spending_query.filter(Transaction.amount < 0).with_entities(
        func.max(func.abs(Transaction.amount))
    ).scalar() or 0

    total_count = query.with_entities(func.count(Transaction.id)).scalar() or 0

    return {
        "total_spent": float(total_spent),
        "transaction_count": int(total_count),
        "largest_expense": float(largest),
    }


def get_transaction(db: Session, tx_id: int) -> Transaction | None:
    return (
        db.query(Transaction)
        .filter(Transaction.id == tx_id, Transaction.is_deleted == False)  # noqa: E712
        .first()
    )


def create_transaction(db: Session, data: TransactionCreate) -> Transaction:
    category_id: int | None = None
    subcategory_id: int | None = None
    transaction_type = data.transaction_type
    confidence: float | None = None
    desc: str = ""

    settings = get_settings()
    if data.category:
        # Resolve provided name to FK
        category_id, subcategory_id = _resolve_category_ids(
            db, data.category, data.subcategory, data.ledger_id
        )
    elif data.source_type == "manual":
        pass  # manual transactions skip classification — type/category set by user
    elif settings.CLASSIFICATION_ENABLED and settings.OPENAI_API_KEY:
        all_cats = category_service.list_categories(db, ledger_id=data.ledger_id)
        tree = build_category_tree(all_cats)
        type_map = build_category_type_map(all_cats)
        seen: set[str] = set()
        parts: list[str] = []
        for p in [data.merchant_normalized, data.description]:
            if p and p not in seen:
                seen.add(p)
                parts.append(p)
        desc = " ".join(parts)
        if desc:
            classifier = get_classifier()
            result = classifier.classify(desc, tree, type_map)
            category_id, subcategory_id = _resolve_category_ids(
                db, result["category"], result["subcategory"], data.ledger_id
            )
            transaction_type = result["transaction_type"]
            confidence = result["confidence"]

    transaction = Transaction(
        import_id=data.import_id,
        ledger_id=data.ledger_id,
        source_type=data.source_type,
        source_name=data.source_name,
        external_id=data.external_id,
        transaction_date=data.transaction_date,
        posted_date=data.posted_date,
        amount=float(data.amount),
        currency=data.currency,
        merchant_raw=data.merchant_raw,
        merchant_normalized=data.merchant_normalized,
        description=data.description,
        transaction_type=transaction_type,
        category_id=category_id,
        subcategory_id=subcategory_id,
        classification_confidence=confidence,
        notes=data.notes,
        is_deleted=False,
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    if confidence is not None:
        db.add(ClassificationLog(
            description=desc,
            category=transaction.category,
            subcategory=transaction.subcategory,
            confidence=confidence,
            model=get_classifier()._model,
            transaction_id=transaction.id,
        ))
        db.commit()

    return transaction


def update_transaction(db: Session, tx_id: int, data: TransactionUpdate) -> Transaction | None:
    transaction = get_transaction(db, tx_id)
    if not transaction:
        return None

    update_data = data.model_dump(exclude_unset=True)

    # Handle category/subcategory specially — resolve names to FK IDs
    category_name = update_data.pop("category", None)
    subcategory_name = update_data.pop("subcategory", None)

    for field, value in update_data.items():
        setattr(transaction, field, value)

    if "category" in data.model_dump(exclude_unset=True) or "subcategory" in data.model_dump(exclude_unset=True):
        cat_id, sub_id = _resolve_category_ids(
            db, category_name, subcategory_name, transaction.ledger_id
        )
        transaction.category_id = cat_id
        transaction.subcategory_id = sub_id
        # Clear LLM confidence when category is manually set
        transaction.classification_confidence = None

    transaction.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(transaction)
    return transaction


def delete_transaction(db: Session, tx_id: int) -> bool:
    """Soft delete — sets is_deleted=True. Returns False if not found."""
    transaction = get_transaction(db, tx_id)
    if not transaction:
        return False
    transaction.is_deleted = True
    transaction.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    return True
