from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.constants.categories import CATEGORY_DATA
from app.models.category_model import Category, Subcategory
from app.schemas.category_schema import CategoryCreate, CategoryUpdate, SubcategoryCreate, SubcategoryUpdate


def list_categories(db: Session, ledger_id: int | None = None) -> list[Category]:
    q = db.query(Category)
    if ledger_id is not None:
        q = q.filter(Category.ledger_id == ledger_id)
    return q.order_by(Category.sort_order.asc().nulls_last(), Category.id.asc()).all()


def reorder_categories(db: Session, ordered_ids: list[int]) -> None:
    """Assign sort_order based on the position of each id in ordered_ids."""
    for position, cat_id in enumerate(ordered_ids):
        db.query(Category).filter(Category.id == cat_id).update({"sort_order": position})
    db.commit()


def seed_categories(db: Session, ledger_id: int) -> None:
    """Idempotent seed: inserts missing categories and syncs icons to match CATEGORY_DATA."""
    existing = {
        c.name: c
        for c in db.query(Category).filter(Category.ledger_id == ledger_id).all()
    }

    dirty = False
    for position, cat_data in enumerate(CATEGORY_DATA):
        canonical_icon = cat_data.get("icon")
        if cat_data["name"] not in existing:
            # Insert new category
            category = Category(
                name=cat_data["name"], icon=canonical_icon, ledger_id=ledger_id,
                sort_order=position,
            )
            db.add(category)
            db.flush()
            dirty = True
            for sub_data in cat_data["subcategories"]:
                if isinstance(sub_data, str):
                    sub_name, sub_icon = sub_data, None
                else:
                    sub_name, sub_icon = sub_data["name"], sub_data.get("icon")
                db.add(Subcategory(category_id=category.id, name=sub_name, icon=sub_icon))
        else:
            # Sync icon on existing category if it differs
            category = existing[cat_data["name"]]
            if category.icon != canonical_icon:
                category.icon = canonical_icon
                dirty = True
            # Sync subcategory icons
            sub_map = {s.name: s for s in category.subcategories}
            for sub_data in cat_data["subcategories"]:
                sub_name = sub_data if isinstance(sub_data, str) else sub_data["name"]
                sub_icon = None if isinstance(sub_data, str) else sub_data.get("icon")
                if sub_name in sub_map and sub_map[sub_name].icon != sub_icon:
                    sub_map[sub_name].icon = sub_icon
                    dirty = True

    if dirty:
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
