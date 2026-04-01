from app.models.category_model import Category


def build_category_tree(categories: list[Category]) -> dict[str, list[str]]:
    """Convert a list of Category ORM objects into a plain dict for the classifier.

    Example output:
        {"Food": ["Restaurant", "Takeout / Delivery"], "Groceries": ["Supermarket", ...]}
    """
    return {
        cat.name: [sub.name for sub in cat.subcategories]
        for cat in categories
    }
