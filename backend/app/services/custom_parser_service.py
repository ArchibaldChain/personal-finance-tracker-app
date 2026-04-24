import csv
import io
import json
from typing import TYPE_CHECKING

from sqlalchemy.orm import Session

from app.models.custom_parser_config_model import CustomParserConfig
from app.parsers.dynamic_parser import DynamicParser
from app.schemas.custom_parser_schema import (
    CustomParserConfigCreate,
    CustomParserConfigUpdate,
    DetectResponse,
    PreviewRequest,
    PreviewResponse,
    PreviewRow,
)

if TYPE_CHECKING:
    pass


def compute_column_signature(headers: list[str]) -> str:
    """Canonical, order-independent fingerprint of a CSV's column headers."""
    return "|".join(sorted(h.strip() for h in headers if h.strip()))


def _invert_mapping(user_mapping: dict[str, str]) -> dict[str, str]:
    """Convert UI mapping (csv_col → field) to storage mapping (field → csv_col).

    Entries mapped to "ignore" are dropped.
    """
    return {field: col for col, field in user_mapping.items() if field != "ignore"}


def create_config(db: Session, payload: CustomParserConfigCreate) -> CustomParserConfig:
    storage_mapping = _invert_mapping(payload.column_mapping)
    signature = compute_column_signature(payload.csv_headers)
    config = CustomParserConfig(
        name=payload.name,
        ledger_id=payload.ledger_id,
        created_by_user_id=payload.created_by_user_id,
        skip_rows=payload.skip_rows,
        column_mapping_json=json.dumps(storage_mapping),
        amount_mode=payload.amount_mode,
        debit_column=payload.debit_column,
        credit_column=payload.credit_column,
        date_format=payload.date_format,
        currency=payload.currency,
        account_type=payload.account_type,
        column_signature=signature,
    )
    db.add(config)
    db.commit()
    db.refresh(config)
    return config


def get_config(db: Session, config_id: int) -> CustomParserConfig | None:
    return db.query(CustomParserConfig).filter(CustomParserConfig.id == config_id).first()


def list_configs(db: Session, ledger_id: int | None = None) -> list[CustomParserConfig]:
    query = db.query(CustomParserConfig)
    if ledger_id is not None:
        query = query.filter(CustomParserConfig.ledger_id == ledger_id)
    return query.order_by(CustomParserConfig.created_at.desc()).all()


def update_config(db: Session, config_id: int, payload: CustomParserConfigUpdate) -> CustomParserConfig | None:
    config = get_config(db, config_id)
    if not config:
        return None

    if payload.name is not None:
        config.name = payload.name
    if payload.skip_rows is not None:
        config.skip_rows = payload.skip_rows
    if payload.column_mapping is not None:
        config.column_mapping_json = json.dumps(_invert_mapping(payload.column_mapping))
    if payload.amount_mode is not None:
        config.amount_mode = payload.amount_mode
    if payload.debit_column is not None:
        config.debit_column = payload.debit_column
    if payload.credit_column is not None:
        config.credit_column = payload.credit_column
    if payload.date_format is not None:
        config.date_format = payload.date_format
    if payload.currency is not None:
        config.currency = payload.currency
    if payload.account_type is not None:
        config.account_type = payload.account_type
    if payload.csv_headers is not None:
        config.column_signature = compute_column_signature(payload.csv_headers)

    db.commit()
    db.refresh(config)
    return config


def delete_config(db: Session, config_id: int) -> bool:
    config = get_config(db, config_id)
    if not config:
        return False
    db.delete(config)
    db.commit()
    return True


def find_matching_config(
    db: Session, headers: list[str], ledger_id: int | None = None
) -> CustomParserConfig | None:
    sig = compute_column_signature(headers)
    query = db.query(CustomParserConfig).filter(CustomParserConfig.column_signature == sig)
    if ledger_id is not None:
        query = query.filter(CustomParserConfig.ledger_id == ledger_id)
    return query.first()


def _read_csv_headers(csv_bytes: bytes, skip_rows: int = 0) -> list[str]:
    """Extract column header names from the CSV, skipping skip_rows lines first."""
    text = csv_bytes.decode("utf-8-sig")
    lines = text.splitlines()
    if skip_rows >= len(lines):
        return []
    data_text = "\n".join(lines[skip_rows:])
    reader = csv.DictReader(io.StringIO(data_text))
    return list(reader.fieldnames or [])


def preview_parse(
    csv_bytes: bytes,
    request: PreviewRequest,
    max_rows: int = 10,
) -> PreviewResponse:
    """Stateless preview — no DB required. Builds a throwaway DynamicParser from the request."""

    # Build a minimal transient config object (not persisted)
    class _TransientConfig:
        skip_rows = request.skip_rows
        column_mapping_json = json.dumps(_invert_mapping(request.column_mapping))
        amount_mode = request.amount_mode
        debit_column = request.debit_column
        credit_column = request.credit_column
        date_format = request.date_format
        currency = request.currency
        account_type = request.account_type

    parser = DynamicParser(_TransientConfig())  # type: ignore[arg-type]
    parse_results = parser.parse_csv(csv_bytes)

    rows: list[PreviewRow] = []
    for row_index, raw, result in parse_results[:max_rows]:
        if isinstance(result, Exception):
            rows.append(PreviewRow(row_index=row_index, raw=raw, parsed=None, error=str(result)))
        else:
            parsed_dict = {
                "transaction_date": result.transaction_date.isoformat(),
                "posted_date": result.posted_date.isoformat() if result.posted_date else None,
                "amount": str(result.amount),
                "description": result.description,
                "currency": result.currency,
                "merchant_raw": result.merchant_raw,
                "notes": result.notes,
            }
            rows.append(PreviewRow(row_index=row_index, raw=raw, parsed=parsed_dict, error=None))

    return PreviewResponse(rows=rows, total_rows=len(parse_results))
