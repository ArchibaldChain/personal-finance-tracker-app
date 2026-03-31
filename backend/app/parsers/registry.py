from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.parsers.base import BaseParser


class ParserRegistry:
    """Registry mapping source names to parser classes.

    Usage:
        registry.register("chase", ChaseParser)
        parser = registry.get("chase")
        sources = registry.list_sources()
    """

    def __init__(self) -> None:
        self._registry: dict[str, type["BaseParser"]] = {}

    def register(self, name: str, parser_class: type["BaseParser"]) -> None:
        self._registry[name.lower()] = parser_class

    def get(self, name: str) -> "BaseParser":
        """Return an instance of the parser for the given source name.

        Raises ValueError if the source is not registered.
        """
        key = name.lower()
        if key not in self._registry:
            available = ", ".join(sorted(self._registry.keys()))
            raise ValueError(
                f"Unknown source '{name}'. Available sources: {available or 'none registered'}"
            )
        return self._registry[key]()

    def list_sources(self) -> list[str]:
        return sorted(self._registry.keys())


# Module-level singleton — import this everywhere
registry = ParserRegistry()
