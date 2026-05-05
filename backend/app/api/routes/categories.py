from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.security import check_ledger_access, get_current_user
from app.db.session import get_db
from app.models.user_model import User
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


class ReorderRequest(BaseModel):
    ordered_ids: list[int]


@router.get("", response_model=CategoryListResponse)
def list_categories(
    ledger_id: int | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CategoryListResponse:
    if ledger_id is not None:
        check_ledger_access(ledger_id, current_user.id, db)
    categories = category_service.list_categories(db, ledger_id=ledger_id)
    return CategoryListResponse(
        categories=[CategoryRead.model_validate(c) for c in categories]
    )


@router.post("/reorder", status_code=204)
def reorder_categories(
    data: ReorderRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    category_service.reorder_categories(db, data.ordered_ids)


@router.post("", response_model=CategoryRead, status_code=201)
def create_category(
    data: CategoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CategoryRead:
    if data.ledger_id is not None:
        check_ledger_access(data.ledger_id, current_user.id, db)
    category = category_service.create_category(db, data)
    return CategoryRead.model_validate(category)


@router.patch("/{category_id}", response_model=CategoryRead)
def update_category(
    category_id: int,
    data: CategoryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CategoryRead:
    category = category_service.update_category(db, category_id, data)
    return CategoryRead.model_validate(category)


@router.delete("/{category_id}", status_code=204)
def delete_category(
    category_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    category_service.delete_category(db, category_id)


@router.post("/{category_id}/subcategories", response_model=SubcategoryRead, status_code=201)
def create_subcategory(
    category_id: int,
    data: SubcategoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SubcategoryRead:
    sub = category_service.create_subcategory(db, category_id, data)
    return SubcategoryRead.model_validate(sub)


@router.patch("/subcategories/{subcategory_id}", response_model=SubcategoryRead)
def update_subcategory(
    subcategory_id: int,
    data: SubcategoryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SubcategoryRead:
    sub = category_service.update_subcategory(db, subcategory_id, data)
    return SubcategoryRead.model_validate(sub)


@router.delete("/subcategories/{subcategory_id}", status_code=204)
def delete_subcategory(
    subcategory_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    category_service.delete_subcategory(db, subcategory_id)