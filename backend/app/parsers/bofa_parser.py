import csv
import hashlib
import io
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from app.parsers.base import BaseParser, ParsedRow

# BofA CSVs typically have several non-data header lines before the actual column header.
# We detect the real header by looking for the expected first column name.
BOFA_FIRST_COLUMN = "Date"


class BofAParser(BaseParser):
    """Parser for Bank of America CSV exports.

    Expected columns (after skipping leading header lines):
        Date, Description, Amount, Running Bal.

    Amount sign convention: negative = debit (expense), positive = credit.
    """

    DATE_FORMAT = "%m/%d/%Y"

    def get_column_mapping(self) -> dict[str, str]:
        return {
            "transaction_date": "Date",
            "description": "Description",
            "amount": "Amount",
        }

    def parse_row(self, raw: dict[str, Any]) -> ParsedRow:
        try:
            transaction_date = datetime.strptime(raw["Date"].strip(), self.DATE_FORMAT).date()
        except (KeyError, ValueError) as e:
            raise ValueError(f"Invalid Date: {raw.get('Date')!r}") from e

        try:
            amount = Decimal(str(raw["Amount"]).strip().replace(",", ""))
        except (KeyError, Exception) as e:
            raise ValueError(f"Invalid Amount: {raw.get('Amount')!r}") from e

        description = raw.get("Description", "").strip()
        merchant_raw = description or None

        dedup_str = f"{transaction_date}|{description}|{amount}"
        external_id = hashlib.md5(dedup_str.encode()).hexdigest()

        return ParsedRow(
            transaction_date=transaction_date,
            amount=amount,
            description=description,
            merchant_raw=merchant_raw,
            external_id=external_id,
        )

    def parse_csv(self, content: bytes) -> list[tuple[int, dict[str, Any], "ParsedRow | Exception"]]:
        """Override to skip BofA's leading non-data header lines.

        BofA CSVs have several metadata lines before the actual column header row.
        We scan forward until we find a line starting with the expected first column.
        """
        text = content.decode("utf-8-sig")
        lines = text.splitlines()

        # Find the index of the actual header row
        header_line_idx = None
        for i, line in enumerate(lines):
            if line.strip().startswith(BOFA_FIRST_COLUMN):
                header_line_idx = i
                break

        if header_line_idx is None:
            raise ValueError(
                f"Could not find BofA CSV header row (expected line starting with '{BOFA_FIRST_COLUMN}')"
            )

        # Rejoin from the header row onward and parse normally
        data_text = "\n".join(lines[header_line_idx:])
        reader = csv.DictReader(io.StringIO(data_text))
        results = []
        for i, row in enumerate(reader):
            raw = dict(row)
            # Skip blank rows that BofA sometimes appends
            if not any(v.strip() for v in raw.values()):
                continue
            try:
                parsed = self.parse_row(raw)
                results.append((i, raw, parsed))
            except Exception as e:
                results.append((i, raw, e))
        return results
