from fastapi import APIRouter

from app.api.routes import categories, imports, sources, transactions

router = APIRouter()
router.include_router(imports.router)
router.include_router(transactions.router)
router.include_router(categories.router)
router.include_router(sources.router)
