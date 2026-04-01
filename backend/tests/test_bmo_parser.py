from datetime import date
from decimal import Decimal

import pytest

from app.parsers.bmo_parser import BMOParser
from app.parsers.registry import registry


@pytest.fixture
def parser() -> BMOParser:
    return BMOParser()


@pytest.fixture
def sample_row() -> dict:
    """A single representative row matching the BMO CSV format."""
    return {
        "Item #": "1",
        "Card #": "'0000000000000000'",
        "Transaction Date": "20260115",
        "Posting Date": "20260116",
        "Transaction Amount": "12.50",
        "Description": "TEST MERCHANT TESTVILLE ON",
    }


# Minimal inline CSV matching the real BMO layout
CSV_BYTES = (
    b"Following data is valid as of 20260330232400:\n"
    b"\n"
    b"Item #,Card #,Transaction Date,Posting Date,Transaction Amount,Description\n"
    b"1,'0000000000000000',20260115,20260116,12.50,TEST MERCHANT TESTVILLE ON\n"
    b"2,'0000000000000000',20260110,20260111,8.99,TEST COFFEE SHOP TESTVILLE ON\n"
    b"3,'0000000000000000',20260105,20260105,-500.00,TRSF FROM/DE ACCT/CPT 0000-XXXX-000\n"
)


class TestBMOParser:
    def test_parse_row_date(self, parser, sample_row):
        result = parser.parse_row(sample_row)
        assert result.transaction_date == date(2026, 1, 15)
        assert result.posted_date == date(2026, 1, 16)

    def test_parse_row_currency_is_cad(self, parser, sample_row):
        result = parser.parse_row(sample_row)
        assert result.currency == "CAD"

    def test_parse_row_charge_is_negated(self, parser, sample_row):
        """CSV positive = expense → stored as negative."""
        result = parser.parse_row(sample_row)
        assert result.amount == Decimal("-12.50")

    def test_parse_row_payment_becomes_positive(self, parser, sample_row):
        """CSV negative = payment/credit → stored as positive."""
        sample_row["Transaction Amount"] = "-500.00"
        result = parser.parse_row(sample_row)
        assert result.amount == Decimal("500.00")

    def test_parse_row_merchant_raw_is_description(self, parser, sample_row):
        result = parser.parse_row(sample_row)
        assert result.merchant_raw == "TEST MERCHANT TESTVILLE ON"
        assert result.description == "TEST MERCHANT TESTVILLE ON"

    def test_parse_row_external_id_is_md5(self, parser, sample_row):
        result = parser.parse_row(sample_row)
        assert result.external_id is not None
        assert len(result.external_id) == 32

    def test_parse_row_external_id_stable(self, parser, sample_row):
        """Same input always produces the same external_id."""
        r1 = parser.parse_row(sample_row)
        r2 = parser.parse_row(sample_row)
        assert r1.external_id == r2.external_id

    def test_parse_row_invalid_date_raises(self, parser, sample_row):
        sample_row["Transaction Date"] = "not-a-date"
        with pytest.raises(ValueError, match="Invalid Transaction Date"):
            parser.parse_row(sample_row)

    def test_parse_row_invalid_amount_raises(self, parser, sample_row):
        sample_row["Transaction Amount"] = "abc"
        with pytest.raises(ValueError, match="Invalid Transaction Amount"):
            parser.parse_row(sample_row)

    def test_parse_row_missing_posting_date_is_none(self, parser, sample_row):
        sample_row["Posting Date"] = ""
        result = parser.parse_row(sample_row)
        assert result.posted_date is None

    def test_registry_registered(self):
        assert isinstance(registry.get("bmo"), BMOParser)

    def test_registry_list_includes_bmo(self):
        assert "bmo" in registry.list_sources()


class TestBMOParserCsv:
    def test_skips_metadata_line(self):
        parser = BMOParser()
        results = parser.parse_csv(CSV_BYTES)
        assert len(results) == 3

    def test_all_rows_succeed(self):
        parser = BMOParser()
        results = parser.parse_csv(CSV_BYTES)
        for _, _, result in results:
            assert not isinstance(result, Exception), str(result)

    def test_first_row_values(self):
        parser = BMOParser()
        _, _, row = parser.parse_csv(CSV_BYTES)[0]
        assert row.transaction_date == date(2026, 1, 15)
        assert row.amount == Decimal("-12.50")
        assert row.merchant_raw == "TEST MERCHANT TESTVILLE ON"
        assert row.currency == "CAD"

    def test_payment_row(self):
        parser = BMOParser()
        _, _, payment = parser.parse_csv(CSV_BYTES)[2]
        assert payment.amount == Decimal("500.00")

    def test_handles_bom(self):
        bom_bytes = b"\xef\xbb\xbf" + CSV_BYTES
        parser = BMOParser()
        results = parser.parse_csv(bom_bytes)
        assert len(results) == 3

    def test_missing_header_raises(self):
        parser = BMOParser()
        with pytest.raises(ValueError, match="Could not find BMO CSV header row"):
            parser.parse_csv(b"no header here\njust garbage\n")


