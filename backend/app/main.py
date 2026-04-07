from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.config import get_settings
import app.db.session as _db_session

# Import parsers to trigger registration as a side-effect
import app.parsers  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Seed categories into the default ledger on startup
    from app.models.user_model import Ledger
    from app.services.category_service import seed_categories

    db = _db_session.SessionLocal()
    try:
        default_ledger = db.query(Ledger).filter_by(is_default=True).first()
        if default_ledger:
            seed_categories(db, ledger_id=default_ledger.id)
    finally:
        db.close()

    yield


settings = get_settings()

app = FastAPI(
    title="Personal Finance Tracker",
    description="Local personal finance tracking app",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok"}
