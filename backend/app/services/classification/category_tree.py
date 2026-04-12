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


def build_category_type_map(categories: list[Category]) -> dict[str, str]:
    """Map each category name to its transaction_type.

    Falls back to 'expense' when transaction_type is not set.

    Example output:
        {"Food": "expense", "Transfers": "transfer", "Income": "income"}
    """
    return {
        cat.name: (cat.transaction_type or "expense")
        for cat in categories
    }
