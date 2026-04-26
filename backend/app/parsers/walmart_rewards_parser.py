import hashlib
from datetime import datetime
from decimal import Decimal
from typing import Any

from app.parsers.base import BaseParser, ParsedRow


class WalmartRewardsParser(BaseParser):
    """Parser for Walmart Rewards Mastercard CSV exports (Capital One Canada).

    Expected columns:
        Date, Posted Date, Reference Number, Activity Type, Status,
        Transaction Card Number, Merchant Category, Merchant Name,
        Merchant City, Merchant State/Province, Merchant Country,
        Merchant Postal Code/Zip, Amount, Rewards, Name on Card

    Amount sign convention (CSV):
        Positive  e.g. "$3.85"      = charge/expense
        Negative  e.g. "-$1,380.96" = payment or refund

    This is the opposite of the app's convention (negative = expense),
    so all amounts are negated on import.

    Date format: YYYY-MM-DD
    """

    account_type = "credit"
    DATE_FORMAT = "%Y-%m-%d"

    def get_column_mapping(self) -> dict[str, str]:
        return {
            "transaction_date": "Date",
            "posted_date": "Posted Date",
            "external_id": "Reference Number",
            "merchant_raw": "Merchant Name",
            "merchant_category": "Merchant Category",
            "amount": "Amount",
        }

    @staticmethod
    def _get(r: dict[str, str], *keys: str) -> str:
        """Case-insensitive key lookup — tries each key, returns first non-empty match."""
        for key in keys:
            val = r.get(key.lower(), "").strip()
            if val:
                return val
        return ""

    def parse_row(self, raw: dict[str, Any]) -> ParsedRow:
        # Normalize all keys to lowercase so column name capitalisation differences
        # between CSV exports (e.g. "Merchant Name" vs "Merchant name") don't matter.
        r = {k.lower(): v for k, v in raw.items()}

        try:
            transaction_date = datetime.strptime(self._get(r, "date", "transaction date"), self.DATE_FORMAT).date()
        except ValueError as e:
            raise ValueError(f"Invalid Date: {r.get('date') or r.get('transaction date')!r}") from e

        try:
            posted_date_str = self._get(r, "posted date")
            posted_date = (
                datetime.strptime(posted_date_str, self.DATE_FORMAT).date()
                if posted_date_str
                else None
            )
        except ValueError:
            posted_date = None

        try:
            raw_amount_str = self._get(r, "amount").strip('"')
            negative = raw_amount_str.startswith("-")
            cleaned = raw_amount_str.lstrip("-").lstrip("+").replace("$", "").replace(",", "").strip()
            magnitude = Decimal(cleaned)
            csv_amount = -magnitude if negative else magnitude
        except Exception as e:
            raise ValueError(f"Invalid Amount: {r.get('amount')!r}") from e

        # Flip sign: CSV positive = expense → store as negative
        amount = -csv_amount

        # Clean up reference number — CSV sometimes wraps it in extra quotes: """REF"""
        ref = self._get(r, "reference number").strip('"')
        external_id = ref if ref else None

        merchant_name = self._get(r, "merchant name")

        # If no reference number, generate a stable hash for deduplication
        if not external_id:
            dedup_str = f"{transaction_date}|{merchant_name}|{amount}"
            external_id = hashlib.md5(dedup_str.encode()).hexdigest()

        merchant_raw = merchant_name or None
        merchant_category = self._get(r, "merchant category") or None

        # Build a richer description from merchant name + city + state + country
        # Handle both "Merchant State/Province" and "Merchant State or Province"
        parts = [
            merchant_name,
            merchant_category,
            self._get(r, "merchant city"),
        ]
        description = ", ".join(p for p in parts if p) or None

        # Merchant category from MCC description
        merchant_category = self._get(r, "merchant category") or None
        notes = f"MCC: {merchant_category}" if merchant_category else None

        return ParsedRow(
            transaction_date=transaction_date,
            posted_date=posted_date,
            amount=amount,
            currency="CAD",
            external_id=external_id,
            merchant_raw=merchant_raw,
            description=description,
            notes=notes,
        )
