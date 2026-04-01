from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.parsers.base import BaseParser


class ParserRegistry:
    """Registry mapping source names to parser classes.

    Usage:
        registry.register("chase", ChaseParser, display_name="Chase")
        parser = registry.get("chase")
        sources = registry.list_sources()  # [{"key": "chase", "display_name": "Chase"}, ...]
    """

    def __init__(self) -> None:
        self._registry: dict[str, type["BaseParser"]] = {}
        self._display_names: dict[str, str] = {}

    def register(self, name: str, parser_class: type["BaseParser"], display_name: str = "") -> None:
        key = name.lower()
        self._registry[key] = parser_class
        self._display_names[key] = display_name or name

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

    def list_sources(self) -> list[dict[str, str]]:
        return [
            {"key": key, "display_name": self._display_names[key]}
            for key in sorted(self._registry.keys())
        ]


# Module-level singleton — import this everywhere
registry = ParserRegistry()
