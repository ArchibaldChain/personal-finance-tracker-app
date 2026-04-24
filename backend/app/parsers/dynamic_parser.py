import csv
import hashlib
import io
import json
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import TYPE_CHECKING, Any

from app.constants.transaction_type import TransactionType
from app.parsers.base import BaseParser, ParsedRow

if TYPE_CHECKING:
    from app.models.custom_parser_config_model import CustomParserConfig


def _parse_decimal(raw_value: str) -> Decimal:
    """Strip common currency formatting and parse to Decimal."""
    cleaned = raw_value.strip().lstrip("$").replace(",", "").replace(" ", "")
    if not cleaned:
        raise ValueError(f"Empty amount value: {raw_value!r}")
    try:
        return Decimal(cleaned)
    except InvalidOperation:
        raise ValueError(f"Cannot parse amount: {raw_value!r}")


class DynamicParser(BaseParser):
    """Runtime-configured parser driven by a CustomParserConfig DB record.

    Implements the same BaseParser interface as all built-in parsers so it
    slots into the existing two-phase import flow unchanged.
    """

    def __init__(self, config: "CustomParserConfig") -> None:
        self._config = config
        self.account_type = config.account_type

    # ------------------------------------------------------------------
    # BaseParser interface
    # ------------------------------------------------------------------

    def get_column_mapping(self) -> dict[str, str]:
        """Returns ParsedRow field → CSV column name (BaseParser convention)."""
        return json.loads(self._config.column_mapping_json)

    def parse_row(self, raw: dict[str, Any]) -> ParsedRow:
        mapping = self.get_column_mapping()

        # --- transaction_date (required) ---
        date_col = mapping.get("transaction_date")
        if not date_col or date_col not in raw:
            raise ValueError(f"Date column {date_col!r} not found in row")
        try:
            transaction_date = datetime.strptime(raw[date_col].strip(), self._config.date_format).date()
        except ValueError:
            raise ValueError(
                f"Cannot parse date {raw[date_col]!r} with format {self._config.date_format!r}"
            )

        # --- amount (required) ---
        amount_col = mapping.get("amount")
        if not amount_col or amount_col not in raw:
            raise ValueError(f"Amount column {amount_col!r} not found in row")
        amount = _parse_decimal(raw[amount_col])
        # Credit accounts: flip the sign so the convention matches debit/investment.
        # A charge shows as positive in the CSV (e.g. 5.00) → stored as -5 (expense).
        # A payment shows as negative (e.g. -1000) → stored as 1000 (income).
        if self._config.account_type == "credit":
            amount = -amount

        # --- description (required) ---
        desc_col = mapping.get("description")
        description = raw.get(desc_col, "").strip() if desc_col else ""
        if not description:
            description = "(no description)"

        # --- optional fields ---
        merchant_col = mapping.get("merchant_raw")
        merchant_raw = raw.get(merchant_col, "").strip() or None if merchant_col else None

        notes_col = mapping.get("notes")
        notes = raw.get(notes_col, "").strip() or None if notes_col else None

        posted_col = mapping.get("posted_date")
        posted_date = None
        if posted_col and raw.get(posted_col, "").strip():
            try:
                posted_date = datetime.strptime(raw[posted_col].strip(), self._config.date_format).date()
            except ValueError:
                posted_date = None

        # stable dedup hash
        dedup_str = f"{transaction_date}|{description}|{amount}"
        external_id = hashlib.md5(dedup_str.encode()).hexdigest()

        return ParsedRow(
            transaction_date=transaction_date,
            posted_date=posted_date,
            amount=amount,
            description=description,
            currency=self._config.currency,
            merchant_raw=merchant_raw or (description if not merchant_raw else None),
            external_id=external_id,
            notes=notes,
        )

    def parse_csv(self, content: bytes) -> list[tuple[int, dict[str, Any], "ParsedRow | Exception"]]:
        """Override to honour skip_rows before the header line."""
        text = content.decode("utf-8-sig")
        lines = text.splitlines()
        if self._config.skip_rows >= len(lines):
            return []
        data_text = "\n".join(lines[self._config.skip_rows:])
        reader = csv.DictReader(io.StringIO(data_text))
        results = []
        for i, row in enumerate(reader):
            raw = dict(row)
            try:
                parsed = self.parse_row(raw)
                results.append((i, raw, parsed))
            except Exception as e:
                results.append((i, raw, e))
        return results

    def infer_transaction_type(self, parsed: ParsedRow) -> TransactionType | None:
        if self._config.account_type == "investment":
            desc = (parsed.description or "").lower()
            if "dividend" in desc or "interest" in desc:
                return TransactionType.INCOME
            return TransactionType.TRANSFER
        # For debit/credit accounts the sign alone is not enough to distinguish
        # income vs transfer vs expense — let the classifier decide.
        return None
