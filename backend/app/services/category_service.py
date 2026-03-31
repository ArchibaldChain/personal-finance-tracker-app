from sqlalchemy.orm import Session

from app.constants.categories import CATEGORY_DATA
from app.models.category_model import Category, Subcategory


def list_categories(db: Session) -> list[Category]:
    return db.query(Category).order_by(Category.name).all()


def seed_categories(db: Session) -> None:
    """Idempotent seed: inserts default categories/subcategories if not already present."""
    if db.query(Category).count() > 0:
        return

    for cat_data in CATEGORY_DATA:
        category = Category(name=cat_data["name"])
        db.add(category)
        db.flush()  # get the category ID before adding subcategories

        for sub_name in cat_data["subcategories"]:
            subcategory = Subcategory(category_id=category.id, name=sub_name)
            db.add(subcategory)

    db.commit()
