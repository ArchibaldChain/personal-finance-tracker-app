"""Unit tests for DynamicParser and custom_parser_service.preview_parse."""
import json
from decimal import Decimal

import pytest

from app.parsers.dynamic_parser import DynamicParser, _parse_decimal
from app.schemas.custom_parser_schema import PreviewRequest
from app.services.custom_parser_service import compute_column_signature, preview_parse


# ---------------------------------------------------------------------------
# Minimal config stubs (no DB needed)
# ---------------------------------------------------------------------------

class _Config:
    """Minimal stand-in for CustomParserConfig for unit tests."""
    def __init__(
        self,
        column_mapping: dict,
        *,
        skip_rows: int = 0,
        amount_mode: str = "single",
        debit_column: str | None = None,
        credit_column: str | None = None,
        date_format: str = "%m/%d/%Y",
        currency: str = "USD",
        account_type: str = "debit",
    ):
        self.column_mapping_json = json.dumps(column_mapping)
        self.skip_rows = skip_rows
        self.amount_mode = amount_mode
        self.debit_column = debit_column
        self.credit_column = credit_column
        self.date_format = date_format
        self.currency = currency
        self.account_type = account_type


SIMPLE_MAPPING = {
    "transaction_date": "Date",
    "amount": "Amount",
    "description": "Description",
}

SIMPLE_CSV = (
    b"Date,Amount,Description\n"
    b"01/15/2026,-5.75,Starbucks\n"
    b"01/16/2026,100.00,Payroll\n"
    b"01/17/2026,-29.99,Amazon\n"
)

SPLIT_CSV = (
    b"Date,Description,Debit,Credit\n"
    b"01/15/2026,Starbucks,5.75,\n"
    b"01/16/2026,Payroll,,3000.00\n"
    b"01/17/2026,Amazon,29.99,\n"
)

SKIP_CSV = (
    b"Bank Export v1\n"
    b"Account: Chequing\n"
    b"Date,Amount,Description\n"
    b"01/15/2026,-5.75,Coffee\n"
)


# ---------------------------------------------------------------------------
# _parse_decimal
# ---------------------------------------------------------------------------

class TestParseDecimal:
    def test_plain_number(self):
        assert _parse_decimal("5.75") == Decimal("5.75")

    def test_strips_dollar_sign(self):
        assert _parse_decimal("$5.75") == Decimal("5.75")

    def test_strips_comma(self):
        assert _parse_decimal("1,234.56") == Decimal("1234.56")

    def test_negative(self):
        assert _parse_decimal("-29.99") == Decimal("-29.99")

    def test_empty_raises(self):
        with pytest.raises(ValueError, match="Empty amount"):
            _parse_decimal("")

    def test_non_numeric_raises(self):
        with pytest.raises(ValueError, match="Cannot parse amount"):
            _parse_decimal("N/A")


# ---------------------------------------------------------------------------
# Single-amount mode
# ---------------------------------------------------------------------------

class TestDynamicParserSingleAmount:
    def test_basic_parse_row(self):
        parser = DynamicParser(_Config(SIMPLE_MAPPING))
        raw = {"Date": "01/15/2026", "Amount": "-5.75", "Description": "Starbucks"}
        row = parser.parse_row(raw)
        assert row.transaction_date.isoformat() == "2026-01-15"
        assert row.amount == Decimal("-5.75")
        assert row.description == "Starbucks"
        assert row.currency == "USD"

    def test_custom_date_format(self):
        mapping = {**SIMPLE_MAPPING, "transaction_date": "Date"}
        parser = DynamicParser(_Config(mapping, date_format="%Y-%m-%d"))
        raw = {"Date": "2026-01-15", "Amount": "100.00", "Description": "Deposit"}
        row = parser.parse_row(raw)
        assert row.transaction_date.isoformat() == "2026-01-15"

    def test_invalid_date_raises(self):
        parser = DynamicParser(_Config(SIMPLE_MAPPING))
        raw = {"Date": "not-a-date", "Amount": "-5.00", "Description": "X"}
        with pytest.raises(ValueError, match="Cannot parse date"):
            parser.parse_row(raw)

    def test_strips_dollar_sign_from_amount(self):
        parser = DynamicParser(_Config(SIMPLE_MAPPING))
        raw = {"Date": "01/15/2026", "Amount": "$1,234.56", "Description": "X"}
        row = parser.parse_row(raw)
        assert row.amount == Decimal("1234.56")

    def test_generates_external_id(self):
        parser = DynamicParser(_Config(SIMPLE_MAPPING))
        raw = {"Date": "01/15/2026", "Amount": "-5.75", "Description": "Starbucks"}
        row = parser.parse_row(raw)
        assert row.external_id is not None
        assert len(row.external_id) == 32  # MD5 hex

    def test_currency_from_config(self):
        parser = DynamicParser(_Config(SIMPLE_MAPPING, currency="CAD"))
        raw = {"Date": "01/15/2026", "Amount": "-5.75", "Description": "X"}
        row = parser.parse_row(raw)
        assert row.currency == "CAD"

    def test_parse_csv_full_file(self):
        parser = DynamicParser(_Config(SIMPLE_MAPPING))
        results = parser.parse_csv(SIMPLE_CSV)
        assert len(results) == 3
        assert all(not isinstance(r[2], Exception) for r in results)

    def test_missing_amount_column_raises(self):
        parser = DynamicParser(_Config(SIMPLE_MAPPING))
        raw = {"Date": "01/15/2026", "Description": "X"}  # no Amount column
        with pytest.raises(ValueError):
            parser.parse_row(raw)


# ---------------------------------------------------------------------------
# Skip rows
# ---------------------------------------------------------------------------

class TestSkipRows:
    def test_skip_two_header_rows(self):
        parser = DynamicParser(_Config(SIMPLE_MAPPING, skip_rows=2))
        results = parser.parse_csv(SKIP_CSV)
        assert len(results) == 1
        _, _, row = results[0]
        assert not isinstance(row, Exception)
        assert row.description == "Coffee"

    def test_skip_zero_keeps_all(self):
        parser = DynamicParser(_Config(SIMPLE_MAPPING, skip_rows=0))
        results = parser.parse_csv(SIMPLE_CSV)
        assert len(results) == 3

    def test_skip_more_than_lines_returns_empty(self):
        parser = DynamicParser(_Config(SIMPLE_MAPPING, skip_rows=100))
        results = parser.parse_csv(SIMPLE_CSV)
        assert results == []


# ---------------------------------------------------------------------------
# Split-amount mode
# ---------------------------------------------------------------------------

class TestSplitAmountMode:
    SPLIT_MAPPING = {
        "transaction_date": "Date",
        "description": "Description",
    }

    def _parser(self):
        return DynamicParser(_Config(
            self.SPLIT_MAPPING,
            amount_mode="split",
            debit_column="Debit",
            credit_column="Credit",
        ))

    def test_debit_only_row_is_negative(self):
        row = self._parser().parse_row(
            {"Date": "01/15/2026", "Description": "Coffee", "Debit": "5.75", "Credit": ""}
        )
        assert row.amount == Decimal("-5.75")

    def test_credit_only_row_is_positive(self):
        row = self._parser().parse_row(
            {"Date": "01/16/2026", "Description": "Payroll", "Debit": "", "Credit": "3000.00"}
        )
        assert row.amount == Decimal("3000.00")

    def test_both_empty_raises(self):
        with pytest.raises(ValueError, match="empty"):
            self._parser().parse_row(
                {"Date": "01/15/2026", "Description": "X", "Debit": "", "Credit": ""}
            )

    def test_full_split_csv(self):
        results = self._parser().parse_csv(SPLIT_CSV)
        assert len(results) == 3
        _, _, r0 = results[0]
        _, _, r1 = results[1]
        assert r0.amount == Decimal("-5.75")
        assert r1.amount == Decimal("3000.00")


# ---------------------------------------------------------------------------
# infer_transaction_type
# ---------------------------------------------------------------------------

class TestInferTransactionType:
    from app.constants.transaction_type import TransactionType

    def _row(self, amount: str):
        from decimal import Decimal
        from app.parsers.base import ParsedRow
        from datetime import date
        return ParsedRow(
            transaction_date=date(2026, 1, 1),
            amount=Decimal(amount),
            description="x",
        )

    def test_debit_negative_is_expense(self):
        from app.constants.transaction_type import TransactionType
        parser = DynamicParser(_Config(SIMPLE_MAPPING, account_type="debit"))
        assert parser.infer_transaction_type(self._row("-10")) == TransactionType.EXPENSE

    def test_debit_positive_is_income(self):
        from app.constants.transaction_type import TransactionType
        parser = DynamicParser(_Config(SIMPLE_MAPPING, account_type="debit"))
        assert parser.infer_transaction_type(self._row("10")) == TransactionType.INCOME

    def test_credit_negative_is_expense(self):
        from app.constants.transaction_type import TransactionType
        parser = DynamicParser(_Config(SIMPLE_MAPPING, account_type="credit"))
        assert parser.infer_transaction_type(self._row("-10")) == TransactionType.EXPENSE

    def test_investment_positive_is_income(self):
        from app.constants.transaction_type import TransactionType
        parser = DynamicParser(_Config(SIMPLE_MAPPING, account_type="investment"))
        assert parser.infer_transaction_type(self._row("50")) == TransactionType.INCOME

    def test_investment_negative_is_expense(self):
        from app.constants.transaction_type import TransactionType
        parser = DynamicParser(_Config(SIMPLE_MAPPING, account_type="investment"))
        assert parser.infer_transaction_type(self._row("-10")) == TransactionType.EXPENSE


# ---------------------------------------------------------------------------
# preview_parse (stateless)
# ---------------------------------------------------------------------------

class TestPreviewParse:
    def _request(self, **kwargs) -> PreviewRequest:
        base = dict(
            skip_rows=0,
            column_mapping={"Date": "transaction_date", "Amount": "amount", "Description": "description"},
            amount_mode="single",
            date_format="%m/%d/%Y",
            currency="USD",
            account_type="debit",
        )
        base.update(kwargs)
        return PreviewRequest(**base)

    def test_returns_up_to_10_rows(self):
        # CSV with 15 data rows
        lines = ["Date,Amount,Description"] + [f"01/{i:02d}/2026,-{i}.00,Item{i}" for i in range(1, 16)]
        csv_bytes = "\n".join(lines).encode()
        response = preview_parse(csv_bytes, self._request())
        assert len(response.rows) == 10
        assert response.total_rows == 15

    def test_marks_failed_rows(self):
        csv_bytes = b"Date,Amount,Description\nnot-a-date,-5.00,X\n"
        response = preview_parse(csv_bytes, self._request())
        assert response.rows[0].error is not None
        assert response.rows[0].parsed is None

    def test_successful_row_has_no_error(self):
        response = preview_parse(SIMPLE_CSV, self._request())
        assert all(r.error is None for r in response.rows)
        assert all(r.parsed is not None for r in response.rows)

    def test_no_db_required(self):
        # Just verifies it runs with no DB session — the function signature has no db arg
        response = preview_parse(SIMPLE_CSV, self._request())
        assert response.total_rows == 3


# ---------------------------------------------------------------------------
# compute_column_signature
# ---------------------------------------------------------------------------

class TestComputeColumnSignature:
    def test_sorted_and_joined(self):
        assert compute_column_signature(["Date", "Amount", "Description"]) == "Amount|Date|Description"

    def test_order_independent(self):
        a = compute_column_signature(["Z", "A", "M"])
        b = compute_column_signature(["M", "Z", "A"])
        assert a == b

    def test_strips_whitespace(self):
        assert compute_column_signature(["  Date  ", "Amount"]) == "Amount|Date"

    def test_ignores_empty_strings(self):
        assert compute_column_signature(["Date", "", "Amount"]) == "Amount|Date"
