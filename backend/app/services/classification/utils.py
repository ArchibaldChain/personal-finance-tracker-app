"""Shared helpers for classification services."""


def resolve_transaction_type(
    category: str | None,
    category_type_map: dict[str, str] | None,
) -> str | None:
    """Resolve transaction_type from a category name.

    Uses the category_type_map when provided; falls back to name-based
    heuristics for the two built-in special categories (Income, Transfers).
    Returns 'expense' for all other cases.
    """
    if category is None:
        return None
    if category_type_map:
        resolved = category_type_map.get(category)
        if resolved:
            return resolved
    # Fallback heuristics (match seed template defaults)
    if category == "Income":
        return "income"
    if category == "Transfers":
        return "transfer"
    return "expense"
