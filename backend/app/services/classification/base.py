from abc import ABC, abstractmethod


class BaseClassifier(ABC):
    @abstractmethod
    def classify(
        self,
        description: str,
        category_tree: dict[str, list[str]],
        category_type_map: dict[str, str] | None = None,
    ) -> dict:
        """Classify a transaction description into a category and subcategory.

        Args:
            description: merchant name or transaction description string
            category_tree: {"Food": ["Restaurant", "Coffee"], "Transport": ["Taxi", ...]}
            category_type_map: {"Food": "expense", "Income": "income", ...}
                               optional mapping of category name → transaction_type

        Returns:
            {
                "transaction_type": str | None,
                "category": str | None,
                "subcategory": str | None,
                "confidence": float,
            }
            Fields are None when classification fails or is uncertain.
        """
        ...
