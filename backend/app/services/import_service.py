import json
import logging
from datetime import date
from decimal import Decimal

from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.config import get_settings
from app.models.category_model import Category, Subcategory
from app.models.classification_log_model import ClassificationLog
from app.models.custom_parser_config_model import CustomParserConfig
from app.models.import_model import Import
from app.models.import_row_model import ImportRow
from app.models.transaction_model import Transaction
from app.parsers import registry
from app.parsers.base import BaseParser, ParsedRow
from app.parsers.dynamic_parser import DynamicParser
from app.services import category_service
from app.services.classification import get_classifier
from app.services.classification.category_tree import build_category_tree, build_category_type_map
from app.services.classification.simple_classifier import SimpleClassifier


def _get_parser(db: Session, source_name: str) -> BaseParser:
    """Return the right parser for a source name.

    Built-in parsers are looked up in the registry.
    Custom parsers (source_name starts with 'custom_') are loaded from the DB.
    """
    if source_name.startswith("custom_"):
        config_id = int(source_name.removeprefix("custom_"))
        config = db.query(CustomParserConfig).filter_by(id=config_id).first()
        if not config:
            raise ValueError(f"Custom parser config {config_id} not found")
        return DynamicParser(config)
    return registry.get(source_name)


def create_import(db: Session, source_name: str, file_name: str, ledger_id: int | None = None) -> Import:
    import_record = Import(
        source_name=source_name,
        file_name=file_name,
        status="pending",
        parsed_rows=0,
        failed_rows=0,
        ledger_id=ledger_id,
    )
    db.add(import_record)
    db.commit()
    db.refresh(import_record)
    return import_record


def store_raw_rows(
    db: Session,
    import_id: int,
    parse_results: list[tuple[int, dict, "ParsedRow | Exception"]],
) -> None:
    """Bulk-insert raw CSV row data and parsed results into import_rows."""
    rows = []
    for row_index, raw_dict, result in parse_results:
        if isinstance(result, ParsedRow):
            parsed_json = json.dumps({
                "transaction_date": result.transaction_date.isoformat(),
                "posted_date": result.posted_date.isoformat() if result.posted_date else None,
                "amount": str(result.amount),
                "description": result.description,
                "currency": result.currency,
                "external_id": result.external_id,
                "merchant_raw": result.merchant_raw,
                "notes": result.notes,
            })
        else:
            parsed_json = None
        rows.append(ImportRow(
            import_id=import_id,
            row_index=row_index,
            raw_json=json.dumps(raw_dict),
            parse_status="pending" if isinstance(result, ParsedRow) else "failed",
            parse_error=str(result) if not isinstance(result, ParsedRow) else None,
            parsed_json=parsed_json,
        ))

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
    try:
        parser = _get_parser(db, import_record.source_name)
        rows = db.query(ImportRow).filter(ImportRow.import_id == import_id).all()

        # Build classifiers and category tree once for the whole batch.
        # SimpleClassifier runs first (free, instant); LLM is the fallback.
        classifier = None
        category_tree: dict[str, list[str]] = {}
        category_type_map: dict[str, str] = {}
        # name → id lookup maps for FK resolution
        cat_name_to_id: dict[str, int] = {}
        sub_name_to_id: dict[tuple[int, str], int] = {}  # (category_id, subname) → sub_id
        settings = get_settings()
        if settings.CLASSIFICATION_ENABLED and settings.OPENAI_API_KEY:
            classifier = get_classifier()
            all_categories = category_service.list_categories(db, ledger_id=import_record.ledger_id)
            category_tree = build_category_tree(all_categories)
            category_type_map = build_category_type_map(all_categories)
        elif settings.CLASSIFICATION_ENABLED:
            all_categories = category_service.list_categories(db, ledger_id=import_record.ledger_id)
            category_tree = build_category_tree(all_categories)
            category_type_map = build_category_type_map(all_categories)
        else:
            all_categories = category_service.list_categories(db, ledger_id=import_record.ledger_id)

        # Build name→id maps once for the batch
        for cat in all_categories:
            cat_name_to_id[cat.name] = cat.id
            for sub in cat.subcategories:
                sub_name_to_id[(cat.id, sub.name)] = sub.id

        pre_classifier = SimpleClassifier() if category_tree else None
        logger.info(
            "import=%d source=%s rows=%d pre_classifier=%s llm_classifier=%s",
            import_id,
            import_record.source_name,
            len(rows),
            "enabled" if pre_classifier else "disabled",
            classifier._model if classifier else "disabled",
        )

        parsed_count = 0
        failed_count = 0

        for row in rows:
            if row.parse_status == "failed":
                failed_count += 1
                continue
            try:
                if row.parsed_json is None:
                    raise ValueError(f"Import row {row.id} has no parsed_json — was it uploaded correctly?")
                d = json.loads(row.parsed_json)
                parsed = ParsedRow(
                    transaction_date=date.fromisoformat(d["transaction_date"]),
                    posted_date=date.fromisoformat(d["posted_date"]) if d.get("posted_date") else None,
                    amount=Decimal(d["amount"]),
                    description=d["description"],
                    currency=d.get("currency", "USD"),
                    external_id=d.get("external_id"),
                    merchant_raw=d.get("merchant_raw"),
                    notes=d.get("notes"),
                )

                transaction_type: str | None = None
                category: str | None = None
                subcategory: str | None = None
                confidence: float | None = None
                classifier_model: str | None = None

                # Apply hard type rules from the parser regardless of whether classification is on
                forced_type = parser.infer_transaction_type(parsed)
                if forced_type is not None:
                    transaction_type = forced_type.value

                if category_tree:
                    seen: set[str] = set()
                    parts: list[str] = []
                    for p in [parsed.merchant_raw, parsed.description, parsed.notes, f"Amount {parsed.amount} {parsed.currency}"]:
                        if p and p not in seen:
                            seen.add(p)
                            parts.append(p)
                    desc = " ".join(parts)
                    if desc:
                        if pre_classifier:
                            result = pre_classifier.classify(desc, category_tree, category_type_map, forced_type)
                            if result["confidence"] > 0.0:
                                transaction_type = result["transaction_type"]
                                category = result["category"]
                                subcategory = result["subcategory"]
                                confidence = result["confidence"]
                                classifier_model = "simple"
                                logger.debug(
                                    "pre_classifier hit: %r -> %s / %s / %s",
                                    desc, transaction_type, category, subcategory,
                                )

                        if confidence is None and classifier:
                            logger.debug("pre_classifier miss, calling LLM for: %r", desc)
                            result = classifier.classify(desc, category_tree, category_type_map, forced_type)
                            transaction_type = result["transaction_type"]
                            category = result["category"]
                            subcategory = result["subcategory"]
                            confidence = result["confidence"]
                            classifier_model = classifier._model
                            logger.debug(
                                "llm classifier: %r -> %s / %s / %s (confidence=%.2f)",
                                desc, transaction_type, category, subcategory, confidence or 0.0,
                            )

                # Extension point: deduplication check on external_id can go here.

                # Resolve category/subcategory names to FK IDs
                cat_id = cat_name_to_id.get(category) if category else None
                sub_id = sub_name_to_id.get((cat_id, subcategory)) if (cat_id and subcategory) else None

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
                    merchant_normalized=parsed.merchant_raw,
                    description=parsed.description,
                    transaction_type=transaction_type,
                    category_id=cat_id,
                    subcategory_id=sub_id,
                    classification_confidence=confidence,
                    notes=parsed.notes,
                    is_deleted=False,
                    ledger_id=import_record.ledger_id,
                )
                db.add(transaction)

                if confidence is not None:
                    db.add(ClassificationLog(
                        description=desc,
                        category=category,
                        subcategory=subcategory,
                        confidence=confidence,
                        model=classifier_model,
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
        logger.info(
            "import=%d done: parsed=%d failed=%d status=%s",
            import_id, parsed_count, failed_count, import_record.status,
        )
        db.commit()
        db.refresh(import_record)
        return import_record

    except Exception as e:
        logger.error("import=%d unexpected error: %s", import_id, e)
        import_record.status = "failed"
        db.commit()
        raise


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


def list_imports(db: Session, ledger_id: int | None = None) -> list[Import]:
    query = db.query(Import)
    if ledger_id is not None:
        query = query.filter(Import.ledger_id == ledger_id)
    return query.order_by(Import.uploaded_at.desc()).all()
