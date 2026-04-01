from abc import ABC, abstractmethod


class BaseClassifier(ABC):
    @abstractmethod
    def classify(self, description: str, category_tree: dict[str, list[str]]) -> dict:
        """Classify a transaction description into a category and subcategory.

        Args:
            description: merchant name or transaction description string
            category_tree: {"Food": ["Restaurant", "Coffee"], "Transport": ["Taxi", ...]}

        Returns:
            {"category": str | None, "subcategory": str | None, "confidence": float}
            category/subcategory are None when classification fails or is uncertain.
        """
        ...
