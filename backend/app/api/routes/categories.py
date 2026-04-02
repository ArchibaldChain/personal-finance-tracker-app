from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.category_schema import (
    CategoryCreate,
    CategoryListResponse,
    CategoryRead,
    CategoryUpdate,
    SubcategoryCreate,
    SubcategoryRead,
    SubcategoryUpdate,
)
from app.services import category_service

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=CategoryListResponse)
def list_categories(db: Session = Depends(get_db)) -> CategoryListResponse:
    categories = category_service.list_categories(db)
    return CategoryListResponse(
        categories=[CategoryRead.model_validate(c) for c in categories]
    )


@router.post("", response_model=CategoryRead, status_code=201)
def create_category(data: CategoryCreate, db: Session = Depends(get_db)) -> CategoryRead:
    category = category_service.create_category(db, data)
    return CategoryRead.model_validate(category)


@router.patch("/{category_id}", response_model=CategoryRead)
def update_category(
    category_id: int, data: CategoryUpdate, db: Session = Depends(get_db)
) -> CategoryRead:
    category = category_service.update_category(db, category_id, data)
    return CategoryRead.model_validate(category)


@router.delete("/{category_id}", status_code=204)
def delete_category(category_id: int, db: Session = Depends(get_db)) -> None:
    category_service.delete_category(db, category_id)


@router.post("/{category_id}/subcategories", response_model=SubcategoryRead, status_code=201)
def create_subcategory(
    category_id: int, data: SubcategoryCreate, db: Session = Depends(get_db)
) -> SubcategoryRead:
    sub = category_service.create_subcategory(db, category_id, data)
    return SubcategoryRead.model_validate(sub)


@router.patch("/subcategories/{subcategory_id}", response_model=SubcategoryRead)
def update_subcategory(
    subcategory_id: int, data: SubcategoryUpdate, db: Session = Depends(get_db)
) -> SubcategoryRead:
    sub = category_service.update_subcategory(db, subcategory_id, data)
    return SubcategoryRead.model_validate(sub)


@router.delete("/subcategories/{subcategory_id}", status_code=204)
def delete_subcategory(subcategory_id: int, db: Session = Depends(get_db)) -> None:
    category_service.delete_subcategory(db, subcategory_id)
