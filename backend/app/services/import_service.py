import json
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.import_model import Import
from app.models.import_row_model import ImportRow
from app.models.transaction_model import Transaction
from app.parsers import registry


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

    parsed_count = 0
    failed_count = 0

    for row in rows:
        raw = json.loads(row.raw_json)
        try:
            parsed = parser.parse_row(raw)

            # Extension point: LLM categorization or rule-based categorization can be
            # inserted here to auto-populate category/subcategory before saving.

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
                notes=parsed.notes,
                is_deleted=False,
            )
            db.add(transaction)

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


def get_import(db: Session, import_id: int) -> Import | None:
    return db.query(Import).filter(Import.id == import_id).first()


def list_imports(db: Session) -> list[Import]:
    return db.query(Import).order_by(Import.uploaded_at.desc()).all()
