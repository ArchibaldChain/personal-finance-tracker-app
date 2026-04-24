from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.custom_parser_config_model import CustomParserConfig
from app.models.transaction_model import Transaction
from app.parsers import registry

router = APIRouter(prefix="/sources", tags=["sources"])


@router.get("")
def list_sources(
    ledger_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
) -> dict:
    """Return all sources: built-in registry parsers plus saved custom parsers."""
    builtin = [{"key": s["key"], "display_name": s["display_name"], "is_custom": False}
               for s in registry.list_sources()]

    q = db.query(CustomParserConfig)
    if ledger_id is not None:
        q = q.filter(CustomParserConfig.ledger_id == ledger_id)
    custom = [{"key": f"custom_{c.id}", "display_name": c.name, "is_custom": True}
              for c in q.order_by(CustomParserConfig.name).all()]

    return {"sources": builtin + custom}


@router.get("/used")
def list_used_sources(
    ledger_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
) -> dict:
    """Return sources that have at least one transaction in the database, optionally filtered by ledger."""
    q = db.query(Transaction.source_name).filter(
        Transaction.is_deleted == False,  # noqa: E712
        Transaction.source_name.isnot(None),
    )
    if ledger_id is not None:
        q = q.filter(Transaction.ledger_id == ledger_id)
    rows = q.distinct().all()
    used_keys = {row[0] for row in rows}

    builtin_sources = {s["key"]: s["display_name"] for s in registry.list_sources()}

    # Resolve display names for custom parsers from the DB
    custom_keys = {k for k in used_keys if k.startswith("custom_")}
    custom_display: dict[str, str] = {}
    if custom_keys:
        config_ids = []
        for k in custom_keys:
            try:
                config_ids.append(int(k.removeprefix("custom_")))
            except ValueError:
                pass
        configs = db.query(CustomParserConfig).filter(CustomParserConfig.id.in_(config_ids)).all()
        for c in configs:
            custom_display[f"custom_{c.id}"] = c.name

    sources = [
        {"key": key, "display_name": builtin_sources.get(key) or custom_display.get(key, key)}
        for key in sorted(used_keys)
        if key in builtin_sources or key in custom_display
    ]
    return {"sources": sources}
