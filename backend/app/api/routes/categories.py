from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.category_schema import CategoryListResponse, CategoryRead
from app.services import category_service

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=CategoryListResponse)
def list_categories(db: Session = Depends(get_db)) -> CategoryListResponse:
    categories = category_service.list_categories(db)
    return CategoryListResponse(
        categories=[CategoryRead.model_validate(c) for c in categories]
    )
