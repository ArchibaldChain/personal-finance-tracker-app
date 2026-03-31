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

    def parse_row(self, raw: dict[str, Any]) -> ParsedRow:
        try:
            transaction_date = datetime.strptime(raw["Date"].strip(), self.DATE_FORMAT).date()
        except (KeyError, ValueError) as e:
            raise ValueError(f"Invalid Date: {raw.get('Date')!r}") from e

        try:
            posted_date_str = raw.get("Posted Date", "").strip()
            posted_date = (
                datetime.strptime(posted_date_str, self.DATE_FORMAT).date()
                if posted_date_str
                else None
            )
        except ValueError:
            posted_date = None

        try:
            raw_amount_str = raw["Amount"].strip()
            # Strip leading/trailing quotes that sometimes appear in the export
            raw_amount_str = raw_amount_str.strip('"')
            # Separate the sign before stripping the $ symbol
            negative = raw_amount_str.startswith("-")
            cleaned = raw_amount_str.lstrip("-").lstrip("+").replace("$", "").replace(",", "").strip()
            magnitude = Decimal(cleaned)
            csv_amount = -magnitude if negative else magnitude
        except (KeyError, Exception) as e:
            raise ValueError(f"Invalid Amount: {raw.get('Amount')!r}") from e

        # Flip sign: CSV positive = expense → store as negative
        amount = -csv_amount

        # Clean up reference number — CSV wraps it in extra quotes: """REF"""
        ref = raw.get("Reference Number", "").strip().strip('"')
        external_id = ref if ref else None

        # If no reference number, generate a stable hash for deduplication
        if not external_id:
            dedup_str = f"{transaction_date}|{raw.get('Merchant Name', '')}|{amount}"
            external_id = hashlib.md5(dedup_str.encode()).hexdigest()

        merchant_raw = raw.get("Merchant Name", "").strip() or None

        # Build a richer description from merchant name + city + country
        parts = [
            raw.get("Merchant Name", "").strip(),
            raw.get("Merchant City", "").strip(),
            raw.get("Merchant State/Province", "").strip(),
            raw.get("Merchant Country", "").strip(),
        ]
        description = ", ".join(p for p in parts if p) or None

        # Merchant category from MCC description
        merchant_category = raw.get("Merchant Category", "").strip() or None
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
