from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.transaction_model import Transaction
from app.parsers import registry

router = APIRouter(prefix="/sources", tags=["sources"])


@router.get("")
def list_sources() -> dict:
    """Return all registered CSV parser sources with display names. Used by frontend import dropdown."""
    return {"sources": registry.list_sources()}


@router.get("/used")
def list_used_sources(db: Session = Depends(get_db)) -> dict:
    """Return sources that have at least one transaction in the database."""
    rows = (
        db.query(Transaction.source_name)
        .filter(Transaction.is_deleted == False, Transaction.source_name.isnot(None))  # noqa: E712
        .distinct()
        .all()
    )
    used_keys = {row[0] for row in rows}

    all_sources = {s["key"]: s["display_name"] for s in registry.list_sources()}
    sources = [
        {"key": key, "display_name": all_sources.get(key, key)}
        for key in sorted(used_keys)
        if key in all_sources
    ]
    return {"sources": sources}
