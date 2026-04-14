"""Shared helpers for classification services."""


def resolve_transaction_type(
    category: str | None,
    category_type_map: dict[str, str] | None,
) -> str | None:
    """Resolve transaction_type from a category name using the DB-backed type map.

    Falls back to 'expense' if the category is not found in the map.
    The map is always built from the categories table, so it reflects any
    renames or custom categories the user has created.
    """
    if category is None:
        return None
    if category_type_map:
        return category_type_map.get(category, "expense")
    return "expense"
