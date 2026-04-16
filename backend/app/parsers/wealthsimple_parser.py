import csv
import hashlib
import io
from collections import defaultdict
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Any

from app.constants.transaction_type import TransactionType
from app.parsers.base import BaseParser, ParsedRow


class WealthsimpleParser(BaseParser):
    """Parser for Wealthsimple CSV exports (all account types).

    Handles both investment accounts (TFSA, RRSP, FHSA) and cash accounts (Chequing).
    The account_type column in each row determines the parsing logic.

    Expected columns:
        transaction_date, settlement_date, account_id, account_type,
        activity_type, activity_sub_type, direction, symbol, name,
        currency, quantity, unit_price, commission, net_cash_amount

    Amount sign convention: already matches app convention —
        negative = money out (expenses, BUY trades), positive = money in (income, SELL, deposits).

    The file ends with a footer line like '"As of 2026-04-14 01:06 GMT-04:00"' which is stripped.
    Rows with an empty net_cash_amount are skipped (no cash movement).

    Cancel-pair deduplication:
        Some Chequing accounts emit both a negative and a matching positive row for the same
        SPEND on the same date (they net to zero). These pairs are detected and both dropped
        in parse_csv before any rows are returned.
    """

    account_type = "investment"
    DATE_FORMAT = "%Y-%m-%d"

    def infer_transaction_type(self, parsed: ParsedRow) -> TransactionType | None:
        desc = (parsed.description or "").strip()
        if desc == "WS Expense":
            return TransactionType.EXPENSE
        if desc.startswith(("BUY ", "SELL ")) or desc in ("E-Transfer", "Account Transfer"):
            return TransactionType.TRANSFER
        if desc == "Interest" or desc.startswith("Dividend"):
            return TransactionType.INCOME
        return None

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
        raw_rows = list(enumerate(csv.DictReader(io.StringIO("\n".join(lines)))))

        # --- Cancel-pair detection ---
        # Group row indices by (account_id, transaction_date, activity_sub_type, abs(amount)).
        # Within each group, cancel min(#positives, #negatives) pairs.
        groups: dict[tuple, list[tuple[int, str]]] = defaultdict(list)
        for i, row in raw_rows:
            amount_str = row.get("net_cash_amount", "").strip()
            if not amount_str:
                continue
            try:
                amount = Decimal(amount_str)
            except InvalidOperation:
                continue
            key = (
                row.get("account_id", "").strip(),
                row.get("transaction_date", "").strip(),
                row.get("activity_sub_type", "").strip(),
                abs(amount),
            )
            sign = "pos" if amount > 0 else "neg"
            groups[key].append((i, sign))

        skip: set[int] = set()
        for entries in groups.values():
            positives = [idx for idx, sign in entries if sign == "pos"]
            negatives = [idx for idx, sign in entries if sign == "neg"]
            pairs = min(len(positives), len(negatives))
            for j in range(pairs):
                skip.add(positives[j])
                skip.add(negatives[j])
        # --- End cancel-pair detection ---

        results = []
        for i, row in raw_rows:
            if i in skip:
                continue
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

        csv_account_type = raw.get("account_type", "").strip()
        activity_type = raw.get("activity_type", "").strip()
        activity_sub_type = raw.get("activity_sub_type", "").strip()
        symbol = raw.get("symbol", "").strip()
        name = raw.get("name", "").strip()
        currency = raw.get("currency", "CAD").strip() or "CAD"

        if csv_account_type == "Chequing":
            if activity_sub_type == "SPEND":
                description = "WS Expense"
            elif activity_sub_type == "E_TRFIN":
                description = "E-Transfer"
            elif activity_sub_type == "EFT":
                description = "Account Transfer"
            elif activity_type == "Interest":
                description = "Interest"
            else:
                description = f"{activity_type} {activity_sub_type}".strip() or activity_type
            merchant_raw = None
        else:
            # TFSA, RRSP, FHSA, or any unknown type — treat as investment
            if activity_type == "Trade" and activity_sub_type == "BUY":
                description = f"BUY {symbol} - {name}" if name else f"BUY {symbol}"
            elif activity_type == "Trade" and activity_sub_type == "SELL":
                description = f"SELL {symbol} - {name}" if name else f"SELL {symbol}"
            elif activity_type == "MoneyMovement" and activity_sub_type == "EFT":
                description = "Account Transfer"
            elif activity_type == "MoneyMovement" and activity_sub_type == "E_TRFIN":
                description = "E-Transfer"
            elif activity_type == "Dividend":
                description = f"Dividend {symbol}".strip() if symbol else "Dividend"
            elif activity_type == "Interest":
                description = "Interest"
            else:
                description = f"{activity_type} {activity_sub_type}".strip() or activity_type
            merchant_raw = name or None

        dedup_str = f"{date_str}|{raw.get('account_id', '')}|{activity_type}|{activity_sub_type}|{symbol}|{net_cash_str}"
        external_id = hashlib.md5(dedup_str.encode()).hexdigest()

        return ParsedRow(
            transaction_date=transaction_date,
            posted_date=posted_date,
            amount=amount,
            currency=currency,
            description=description,
            merchant_raw=merchant_raw,
            external_id=external_id,
        )
