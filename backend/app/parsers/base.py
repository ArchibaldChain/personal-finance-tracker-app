import csv
import io
from abc import ABC, abstractmethod
from datetime import date
from decimal import Decimal
from typing import Any

from app.constants.transaction_type import TransactionType


class ParsedRow:
    """Normalized output of a parsed CSV row."""

    def __init__(
        self,
        transaction_date: date,
        amount: Decimal,
        description: str,
        currency: str = "USD",
        external_id: str | None = None,
        posted_date: date | None = None,
        merchant_raw: str | None = None,
        notes: str | None = None,
    ) -> None:
        self.transaction_date = transaction_date
        self.amount = amount
        self.description = description
        self.currency = currency
        self.external_id = external_id
        self.posted_date = posted_date
        self.merchant_raw = merchant_raw
        self.notes = notes


class BaseParser(ABC):
    """Abstract base class all institution parsers must implement.

    To add a new institution:
    1. Create a new module in app/parsers/ (e.g., wells_fargo_parser.py)
    2. Subclass BaseParser and implement parse_row() and get_column_mapping()
    3. Register it in app/parsers/__init__.py

    Class attributes:
        account_type: Broad account category used to apply hard classification rules
                      before falling back to the LLM. One of "debit", "credit", "investment".
    """

    account_type: str = "debit"

    def infer_transaction_type(self, parsed: "ParsedRow") -> TransactionType | None:
        """Return a definitive TransactionType based on hard rules, or None to let the classifier decide."""
        return None

    @abstractmethod
    def parse_row(self, raw: dict[str, Any]) -> ParsedRow:
        """Parse a single raw CSV row dict into a ParsedRow.

        The raw dict keys are the original CSV column headers.
        Raise ValueError with a descriptive message on parse failure.
        """
        ...

    @abstractmethod
    def get_column_mapping(self) -> dict[str, str]:
        """Return a mapping from normalized field names to CSV column headers.

        Example: {"transaction_date": "Transaction Date", "amount": "Amount"}
        Used for validation — not for parsing logic (parse_row handles that directly).
        """
        ...

    def parse_csv(self, content: bytes) -> list[tuple[int, dict[str, Any], "ParsedRow | Exception"]]:
        """Parse CSV bytes into a list of (row_index, raw_dict, result) tuples.

        result is either a ParsedRow (success) or an Exception (failure).
        Subclasses can override this to handle non-standard CSV layouts (e.g., BofA header rows).
        """
        text = content.decode("utf-8-sig")  # utf-8-sig handles BOM characters
        reader = csv.DictReader(io.StringIO(text))
        results = []
        for i, row in enumerate(reader):
            raw = dict(row)
            try:
                parsed = self.parse_row(raw)
                results.append((i, raw, parsed))
            except Exception as e:
                results.append((i, raw, e))
        return results
