from fastapi import APIRouter

from app.parsers import registry

router = APIRouter(prefix="/sources", tags=["sources"])


@router.get("")
def list_sources() -> dict:
    """Return all registered CSV parser sources with display names. Used by frontend import dropdown."""
    return {"sources": registry.list_sources()}
