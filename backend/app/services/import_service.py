import json
from datetime import datetime

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.classification_log_model import ClassificationLog
from app.models.import_model import Import
from app.models.import_row_model import ImportRow
from app.models.transaction_model import Transaction
from app.parsers import registry
from app.services import category_service
from app.services.classification import get_classifier
from app.services.classification.category_tree import build_category_tree


def create_import(db: Session, source_name: str, file_name: str) -> Import:
    import_record = Import(
        source_name=source_name,
        file_name=file_name,
        status="pending",
        parsed_rows=0,
        failed_rows=0,
    )
    db.add(import_record)
    db.commit()
    db.refresh(import_record)
    return import_record


def store_raw_rows(
    db: Session, import_id: int, raw_rows: list[tuple[int, dict]]
) -> None:
    """Bulk-insert raw CSV row data into import_rows."""
    rows = [
        ImportRow(
            import_id=import_id,
            row_index=row_index,
            raw_json=json.dumps(raw_dict),
            parse_status="pending",
        )
        for row_index, raw_dict in raw_rows
    ]
    db.bulk_save_objects(rows)

    # Update total_rows count
    db.query(Import).filter(Import.id == import_id).update({"total_rows": len(rows)})
    db.commit()


def process_import(db: Session, import_id: int) -> Import:
    """Parse raw rows and create normalized transactions.

    Two-phase design:
    - Phase 1 (create_import + store_raw_rows): stores raw data, never loses it
    - Phase 2 (this function): normalizes rows into transactions

    Extension points:
    - LLM categorization: insert a call between parsed row creation and transaction save
    - Deduplication: check external_id before inserting in _create_transaction_from_row
    """
    import_record = db.query(Import).filter(Import.id == import_id).first()
    if not import_record:
        raise ValueError(f"Import {import_id} not found")

    if import_record.status == "processed":
        raise ValueError(f"Import {import_id} has already been processed")

    import_record.status = "processing"
    db.commit()

    parser = registry.get(import_record.source_name)
    rows = db.query(ImportRow).filter(ImportRow.import_id == import_id).all()

    # Build classifier and category tree once for the whole batch
    classifier = None
    category_tree: dict[str, list[str]] = {}
    settings = get_settings()
    if settings.CLASSIFICATION_ENABLED and settings.OPENAI_API_KEY:
        classifier = get_classifier()
        category_tree = build_category_tree(category_service.list_categories(db))

    parsed_count = 0
    failed_count = 0

    for row in rows:
        raw = json.loads(row.raw_json)
        try:
            parsed = parser.parse_row(raw)

            category: str | None = None
            subcategory: str | None = None
            confidence: float | None = None
            if classifier and category_tree:
                seen: set[str] = set()
                parts: list[str] = []
                for p in [parsed.merchant_raw, parsed.description, parsed.notes]:
                    if p and p not in seen:
                        seen.add(p)
                        parts.append(p)
                desc = " ".join(parts)
                if desc:
                    result = classifier.classify(desc, category_tree)
                    category = result["category"]
                    subcategory = result["subcategory"]
                    confidence = result["confidence"]

            # Extension point: deduplication check on external_id can go here.

            transaction = Transaction(
                import_id=import_id,
                source_type="csv",
                source_name=import_record.source_name,
                external_id=parsed.external_id,
                transaction_date=parsed.transaction_date,
                posted_date=parsed.posted_date,
                amount=float(parsed.amount),
                currency=parsed.currency,
                merchant_raw=parsed.merchant_raw,
                merchant_normalized=parsed.merchant_raw,  # raw used as initial normalized value
                description=parsed.description,
                category=category,
                subcategory=subcategory,
                classification_confidence=confidence,
                notes=parsed.notes,
                is_deleted=False,
            )
            db.add(transaction)

            if confidence is not None:
                db.add(ClassificationLog(
                    description=desc,
                    category=category,
                    subcategory=subcategory,
                    confidence=confidence,
                    model=classifier._model,
                    # transaction_id is None here — ID not available until batch commit
                ))

            row.parse_status = "success"
            parsed_count += 1

        except Exception as e:
            row.parse_status = "failed"
            row.parse_error = str(e)
            failed_count += 1

    import_record.parsed_rows = parsed_count
    import_record.failed_rows = failed_count
    import_record.status = "processed" if failed_count == 0 else "processed_with_errors"
    db.commit()
    db.refresh(import_record)
    return import_record


def delete_import(db: Session, import_id: int) -> None:
    """Hard-delete an import and all its associated transactions and raw rows."""
    import_record = db.query(Import).filter(Import.id == import_id).first()
    if not import_record:
        raise ValueError(f"Import {import_id} not found")
    db.query(Transaction).filter(Transaction.import_id == import_id).delete()
    db.query(ImportRow).filter(ImportRow.import_id == import_id).delete()
    db.delete(import_record)
    db.commit()


def get_import(db: Session, import_id: int) -> Import | None:
    return db.query(Import).filter(Import.id == import_id).first()


def list_imports(db: Session) -> list[Import]:
    return db.query(Import).order_by(Import.uploaded_at.desc()).all()
