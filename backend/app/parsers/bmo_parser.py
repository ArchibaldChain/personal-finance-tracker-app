import csv
import hashlib
import io
from datetime import datetime
from decimal import Decimal
from typing import Any

from app.parsers.base import BaseParser, ParsedRow


class BMODebitParser(BaseParser):
    """Parser for BMO debit card CSV exports.

    File layout:
        Line 1: metadata  e.g. "Following data is valid as of ..."
        Repeated sections (one per account segment), each containing:
            Header: First Bank Card,Transaction Type,Date Posted, Transaction Amount,Description
            Blank lines
            Data rows

    Columns:
        First Bank Card: card number (single-quoted)
        Transaction Type: DEBIT or CREDIT
        Date Posted: YYYYMMDD
        Transaction Amount: negative for debits, positive for credits
        Description: merchant description with trailing whitespace

    Amount sign convention: CSV sign already matches app convention
        (negative = expense/debit, positive = income/credit) — no flip needed.

    Currency: CAD
    """

    DATE_FORMAT = "%Y%m%d"
    _HEADER_START = "First Bank Card"
    _SKIP_PREFIXES = ("Following data",)

    def get_column_mapping(self) -> dict[str, str]:
        return {
            "transaction_date": "Date Posted",
            "merchant_raw": "Description",
            "amount": "Transaction Amount",
        }

    def parse_csv(self, content: bytes) -> list[tuple[int, dict[str, Any], "ParsedRow | Exception"]]:
        """Flatten multiple header/data sections into a single pass."""
        text = content.decode("utf-8-sig")
        lines = text.splitlines()

        header_line: str | None = None
        data_lines: list[str] = []

        for line in lines:
            stripped = line.strip()
            if not stripped:
                continue
            if any(stripped.startswith(p) for p in self._SKIP_PREFIXES):
                continue
            if stripped.startswith(self._HEADER_START):
                header_line = stripped
                continue
            data_lines.append(line)

        if header_line is None:
            raise ValueError(
                "Could not find BMO Debit CSV header row "
                f"(expected line starting with '{self._HEADER_START}')"
            )

        csv_text = header_line + "\n" + "\n".join(data_lines)
        reader = csv.DictReader(io.StringIO(csv_text))
        results = []
        for i, row in enumerate(reader):
            # Strip whitespace from column names to handle " Transaction Amount"
            raw = {k.strip(): v for k, v in row.items()}
            try:
                parsed = self.parse_row(raw)
                results.append((i, raw, parsed))
            except Exception as e:
                results.append((i, raw, e))
        return results

    def parse_row(self, raw: dict[str, Any]) -> ParsedRow:
        date_str = raw.get("Date Posted", "").strip()
        try:
            transaction_date = datetime.strptime(date_str, self.DATE_FORMAT).date()
        except ValueError as e:
            raise ValueError(f"Invalid Date Posted: {date_str!r}") from e

        amount_str = raw.get("Transaction Amount", "").strip()
        try:
            amount = Decimal(amount_str)
        except Exception as e:
            raise ValueError(f"Invalid Transaction Amount: {amount_str!r}") from e

        description = raw.get("Description", "").strip() or None

        dedup_str = f"{transaction_date}|{description}|{amount}"
        external_id = hashlib.md5(dedup_str.encode()).hexdigest()

        return ParsedRow(
            transaction_date=transaction_date,
            posted_date=transaction_date,
            amount=amount,
            currency="CAD",
            external_id=external_id,
            merchant_raw=description,
            description=description,
        )


class BMOCreditParser(BaseParser):
    """Parser for BMO (Bank of Montreal) credit card CSV exports.

    File layout:
        Line 1: metadata  e.g. "Following data is valid as of 20260330232400:"
        Line 2: blank
        Line 3: column headers
        Line 4+: data rows

    Expected columns:
        Item #, Card #, Transaction Date, Posting Date, Transaction Amount, Description

    Amount sign convention (CSV):
        Positive  e.g.  6.0    = charge/expense
        Negative  e.g. -915.23 = payment or credit

    This is the opposite of the app's convention (negative = expense),
    so all amounts are negated on import.

    Date format: YYYYMMDD
    Currency: CAD
    """

    DATE_FORMAT = "%Y%m%d"

    def get_column_mapping(self) -> dict[str, str]:
        return {
            "transaction_date": "Transaction Date",
            "posted_date": "Posting Date",
            "merchant_raw": "Description",
            "amount": "Transaction Amount",
        }

    def parse_csv(self, content: bytes) -> list[tuple[int, dict[str, Any], "ParsedRow | Exception"]]:
        """Skip the BMO metadata line and blank line before parsing."""
        text = content.decode("utf-8-sig")
        lines = text.splitlines()

        # Find the header row — first line that starts with "Item #"
        header_index = next(
            (i for i, line in enumerate(lines) if line.strip().startswith("Item #")),
            None,
        )
        if header_index is None:
            raise ValueError("Could not find BMO CSV header row (expected 'Item #,...')")

        csv_text = "\n".join(lines[header_index:])
        reader = csv.DictReader(io.StringIO(csv_text))
        results = []
        for i, row in enumerate(reader):
            raw = dict(row)
            try:
                parsed = self.parse_row(raw)
                results.append((i, raw, parsed))
            except Exception as e:
                results.append((i, raw, e))
        return results

    def parse_row(self, raw: dict[str, Any]) -> ParsedRow:
        date_str = raw.get("Transaction Date", "").strip()
        try:
            transaction_date = datetime.strptime(date_str, self.DATE_FORMAT).date()
        except ValueError as e:
            raise ValueError(f"Invalid Transaction Date: {date_str!r}") from e

        posting_str = raw.get("Posting Date", "").strip()
        try:
            posted_date = (
                datetime.strptime(posting_str, self.DATE_FORMAT).date()
                if posting_str
                else None
            )
        except ValueError:
            posted_date = None

        amount_str = raw.get("Transaction Amount", "").strip()
        try:
            csv_amount = Decimal(amount_str)
        except Exception as e:
            raise ValueError(f"Invalid Transaction Amount: {amount_str!r}") from e

        # Flip sign: CSV positive = expense → store as negative
        amount = -csv_amount

        description = raw.get("Description", "").strip() or None
        merchant_raw = description

        # Stable external_id — Item # resets each export so it's not globally unique
        dedup_str = f"{transaction_date}|{description}|{amount}"
        external_id = hashlib.md5(dedup_str.encode()).hexdigest()

        return ParsedRow(
            transaction_date=transaction_date,
            posted_date=posted_date,
            amount=amount,
            currency="CAD",
            external_id=external_id,
            merchant_raw=merchant_raw,
            description=description,
        )