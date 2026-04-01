import hashlib

_cache: dict[str, dict] = {}


def _make_key(description: str) -> str:
    normalized = description.strip().lower()
    return hashlib.sha256(normalized.encode()).hexdigest()[:16]


def get_cached(description: str, category_tree: dict[str, list[str]]) -> dict | None:
    result = _cache.get(_make_key(description))
    if result is None:
        return None
    # Validate that the cached category still exists in the current tree.
    # If a category was deleted since caching, treat as a cache miss.
    cached_category = result.get("category")
    if cached_category is not None and cached_category not in category_tree:
        return None
    return result


def set_cached(description: str, result: dict) -> None:
    _cache[_make_key(description)] = result


def clear_cache() -> None:
    """Reset cache — used in tests to isolate state between runs."""
    _cache.clear()
