import csv
import hashlib
import io
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Any

from app.parsers.base import BaseParser, ParsedRow


class WealthsimpleInvestmentParser(BaseParser):
    """Parser for Wealthsimple investment account CSV exports (TFSA, RRSP, etc.).

    Expected columns:
        transaction_date, settlement_date, account_id, account_type,
        activity_type, activity_sub_type, direction, symbol, name,
        currency, quantity, unit_price, commission, net_cash_amount

    Amount sign convention: already matches app convention —
        negative = money out (BUY trades), positive = money in (SELL, deposits, dividends, interest).

    The file ends with a footer line like '"As of 2026-04-12 01:40 GMT-04:00"' which is stripped.
    Rows with an empty net_cash_amount are skipped (no cash movement).
    """

    DATE_FORMAT = "%Y-%m-%d"

    def get_column_mapping(self) -> dict[str, str]:
        return {
            "transaction_date": "transaction_date",
            "posted_date": "settlement_date",
            "amount": "net_cash_amount",
            "description": "name",
            "symbol": "symbol",
            "activity_type": "activity_type",
            "activity_sub_type": "activity_sub_type",
            "currency": "currency",
        }

    def parse_csv(self, content: bytes) -> list[tuple[int, dict[str, Any], "ParsedRow | Exception"]]:
        text = content.decode("utf-8-sig")
        lines = [line for line in text.splitlines() if not line.strip().startswith('"As of')]
        reader = csv.DictReader(io.StringIO("\n".join(lines)))
        results = []
        for i, row in enumerate(reader):
            raw = dict(row)
            try:
                parsed = self.parse_row(raw)
                if parsed is None:
                    continue
                results.append((i, raw, parsed))
            except Exception as e:
                results.append((i, raw, e))
        return results

    def parse_row(self, raw: dict[str, Any]) -> ParsedRow | None:
        net_cash_str = raw.get("net_cash_amount", "").strip()
        if not net_cash_str:
            return None

        try:
            amount = Decimal(net_cash_str)
        except InvalidOperation as e:
            raise ValueError(f"Invalid net_cash_amount: {net_cash_str!r}") from e

        date_str = raw.get("transaction_date", "").strip()
        try:
            transaction_date = datetime.strptime(date_str, self.DATE_FORMAT).date()
        except ValueError as e:
            raise ValueError(f"Invalid transaction_date: {date_str!r}") from e

        settlement_str = raw.get("settlement_date", "").strip()
        try:
            posted_date = datetime.strptime(settlement_str, self.DATE_FORMAT).date() if settlement_str else None
        except ValueError:
            posted_date = None

        activity_type = raw.get("activity_type", "").strip()
        activity_sub_type = raw.get("activity_sub_type", "").strip()
        symbol = raw.get("symbol", "").strip()
        name = raw.get("name", "").strip()

        if activity_type == "Trade" and activity_sub_type == "BUY":
            description = f"BUY {symbol} - {name}" if name else f"BUY {symbol}"
        elif activity_type == "Trade" and activity_sub_type == "SELL":
            description = f"SELL {symbol} - {name}" if name else f"SELL {symbol}"
        elif activity_type == "MoneyMovement" and activity_sub_type == "EFT":
            description = "EFT Deposit"
        elif activity_type == "Dividend":
            description = f"Dividend {symbol}".strip() if symbol else "Dividend"
        elif activity_type == "Interest":
            description = "Interest"
        else:
            description = f"{activity_type} {activity_sub_type}".strip() or activity_type

        currency = raw.get("currency", "CAD").strip() or "CAD"

        dedup_str = f"{date_str}|{activity_type}|{activity_sub_type}|{symbol}|{net_cash_str}"
        external_id = hashlib.md5(dedup_str.encode()).hexdigest()

        return ParsedRow(
            transaction_date=transaction_date,
            posted_date=posted_date,
            amount=amount,
            currency=currency,
            description=description,
            merchant_raw=name or None,
            external_id=external_id,
        )
