from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.constants.categories import CATEGORY_DATA
from app.models.category_model import Category, Subcategory
from app.schemas.category_schema import CategoryCreate, CategoryUpdate, SubcategoryCreate, SubcategoryUpdate


def list_categories(db: Session) -> list[Category]:
    return db.query(Category).order_by(Category.name).all()


def seed_categories(db: Session) -> None:
    """Idempotent seed: inserts default categories/subcategories if not already present."""
    if db.query(Category).count() > 0:
        return

    for cat_data in CATEGORY_DATA:
        category = Category(name=cat_data["name"], icon=cat_data.get("icon"))
        db.add(category)
        db.flush()

        for sub_data in cat_data["subcategories"]:
            if isinstance(sub_data, str):
                sub_name, sub_icon = sub_data, None
            else:
                sub_name, sub_icon = sub_data["name"], sub_data.get("icon")
            db.add(Subcategory(category_id=category.id, name=sub_name, icon=sub_icon))

    db.commit()


def create_category(db: Session, data: CategoryCreate) -> Category:
    if db.query(Category).filter(Category.name == data.name).first():
        raise HTTPException(status_code=409, detail="Category already exists")
    category = Category(name=data.name, icon=data.icon)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def update_category(db: Session, category_id: int, data: CategoryUpdate) -> Category:
    category = db.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    if data.name is not None:
        category.name = data.name
    if data.icon is not None:
        category.icon = data.icon
    db.commit()
    db.refresh(category)
    return category


def delete_category(db: Session, category_id: int) -> None:
    category = db.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(category)
    db.commit()


def create_subcategory(db: Session, category_id: int, data: SubcategoryCreate) -> Subcategory:
    if not db.get(Category, category_id):
        raise HTTPException(status_code=404, detail="Category not found")
    sub = Subcategory(category_id=category_id, name=data.name, icon=data.icon)
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


def update_subcategory(db: Session, subcategory_id: int, data: SubcategoryUpdate) -> Subcategory:
    sub = db.get(Subcategory, subcategory_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Subcategory not found")
    if data.name is not None:
        sub.name = data.name
    if data.icon is not None:
        sub.icon = data.icon
    db.commit()
    db.refresh(sub)
    return sub


def delete_subcategory(db: Session, subcategory_id: int) -> None:
    sub = db.get(Subcategory, subcategory_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Subcategory not found")
    db.delete(sub)
    db.commit()
