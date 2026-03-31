import hashlib
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from app.parsers.base import BaseParser, ParsedRow


class ChaseParser(BaseParser):
    """Parser for Chase Bank CSV exports.

    Expected columns:
        Transaction Date, Post Date, Description, Category, Type, Amount, Memo

    Amount sign convention: negative = debit (expense), positive = credit (payment/refund).
    """

    DATE_FORMAT = "%m/%d/%Y"

    def get_column_mapping(self) -> dict[str, str]:
        return {
            "transaction_date": "Transaction Date",
            "posted_date": "Post Date",
            "description": "Description",
            "amount": "Amount",
            "memo": "Memo",
        }

    def parse_row(self, raw: dict[str, Any]) -> ParsedRow:
        try:
            transaction_date = datetime.strptime(raw["Transaction Date"].strip(), self.DATE_FORMAT).date()
        except (KeyError, ValueError) as e:
            raise ValueError(f"Invalid Transaction Date: {raw.get('Transaction Date')!r}") from e

        try:
            posted_date_str = raw.get("Post Date", "").strip()
            posted_date: date | None = (
                datetime.strptime(posted_date_str, self.DATE_FORMAT).date() if posted_date_str else None
            )
        except ValueError:
            posted_date = None

        try:
            amount = Decimal(str(raw["Amount"]).strip().replace(",", ""))
        except (KeyError, Exception) as e:
            raise ValueError(f"Invalid Amount: {raw.get('Amount')!r}") from e

        description = raw.get("Description", "").strip()
        merchant_raw = description or None
        memo = raw.get("Memo", "").strip() or None

        # Generate a stable external_id for deduplication
        dedup_str = f"{transaction_date}|{description}|{amount}"
        external_id = hashlib.md5(dedup_str.encode()).hexdigest()

        return ParsedRow(
            transaction_date=transaction_date,
            posted_date=posted_date,
            amount=amount,
            description=description,
            merchant_raw=merchant_raw,
            external_id=external_id,
            notes=memo,
        )
