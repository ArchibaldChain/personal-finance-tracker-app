from datetime import datetime, timezone

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.transaction_model import Transaction
from app.schemas.transaction_schema import TransactionCreate, TransactionUpdate

# Whitelist of sortable fields to prevent SQL injection via sort_by param
SORTABLE_FIELDS = {
    "transaction_date": Transaction.transaction_date,
    "amount": Transaction.amount,
    "merchant_normalized": Transaction.merchant_normalized,
    "category": Transaction.category,
    "created_at": Transaction.created_at,
}


def list_transactions(
    db: Session,
    search: str | None = None,
    category: str | None = None,
    source_type: str | None = None,
    sort_by: str = "transaction_date",
    sort_dir: str = "desc",
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[Transaction], int]:
    query = db.query(Transaction).filter(Transaction.is_deleted == False)  # noqa: E712

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
        query = query.filter(Transaction.category == category)

    if source_type:
        query = query.filter(Transaction.source_type == source_type)

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


def get_transaction(db: Session, tx_id: int) -> Transaction | None:
    return (
        db.query(Transaction)
        .filter(Transaction.id == tx_id, Transaction.is_deleted == False)  # noqa: E712
        .first()
    )


def create_transaction(db: Session, data: TransactionCreate) -> Transaction:
    # Extension point: deduplication check on external_id can be inserted here.

    transaction = Transaction(
        import_id=data.import_id,
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
        category=data.category,
        subcategory=data.subcategory,
        notes=data.notes,
        is_deleted=False,
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


def update_transaction(db: Session, tx_id: int, data: TransactionUpdate) -> Transaction | None:
    transaction = get_transaction(db, tx_id)
    if not transaction:
        return None

    # Only update fields that were explicitly provided (PATCH semantics)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(transaction, field, value)

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
