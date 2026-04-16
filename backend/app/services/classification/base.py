from abc import ABC, abstractmethod

from app.constants.transaction_type import TransactionType


class BaseClassifier(ABC):
    @abstractmethod
    def classify(
        self,
        description: str,
        category_tree: dict[str, list[str]],
        category_type_map: dict[str, str] | None = None,
        forced_type: TransactionType | None = None,
    ) -> dict:
        """Classify a transaction description into a category and subcategory.

        Args:
            description: merchant name or transaction description string
            category_tree: {"Food": ["Restaurant", "Coffee"], "Transport": ["Taxi", ...]}
            category_type_map: {"Food": "expense", "Income": "income", ...}
                               optional mapping of category name → transaction_type
            forced_type: when provided, transaction_type is already determined — only
                         category/subcategory will be classified, using a filtered category
                         tree matching the forced type.

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
