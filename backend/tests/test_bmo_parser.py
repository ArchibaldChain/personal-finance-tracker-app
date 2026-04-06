from datetime import date
from decimal import Decimal

import pytest

from app.parsers.bmo_parser import BMODebitParser, BMOCreditParser
from app.parsers.registry import registry


@pytest.fixture
def parser() -> BMOCreditParser:
    return BMOCreditParser()


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


class TestBMOCreditParser:
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
        assert isinstance(registry.get("bmo_credit_card"), BMOCreditParser)

    def test_registry_list_includes_bmo(self):
        assert any(s["key"] == "bmo_credit_card" for s in registry.list_sources())


class TestBMOCreditParserCsv:
    def test_skips_metadata_line(self):
        parser = BMOCreditParser()
        results = parser.parse_csv(CSV_BYTES)
        assert len(results) == 3

    def test_all_rows_succeed(self):
        parser = BMOCreditParser()
        results = parser.parse_csv(CSV_BYTES)
        for _, _, result in results:
            assert not isinstance(result, Exception), str(result)

    def test_first_row_values(self):
        parser = BMOCreditParser()
        _, _, row = parser.parse_csv(CSV_BYTES)[0]
        assert row.transaction_date == date(2026, 1, 15)
        assert row.amount == Decimal("-12.50")
        assert row.merchant_raw == "TEST MERCHANT TESTVILLE ON"
        assert row.currency == "CAD"

    def test_payment_row(self):
        parser = BMOCreditParser()
        _, _, payment = parser.parse_csv(CSV_BYTES)[2]
        assert payment.amount == Decimal("500.00")

    def test_handles_bom(self):
        bom_bytes = b"\xef\xbb\xbf" + CSV_BYTES
        parser = BMOCreditParser()
        results = parser.parse_csv(bom_bytes)
        assert len(results) == 3

    def test_missing_header_raises(self):
        parser = BMOCreditParser()
        with pytest.raises(ValueError, match="Could not find BMO CSV header row"):
            parser.parse_csv(b"no header here\njust garbage\n")


# ---------------------------------------------------------------------------
# BMO Debit Card
# ---------------------------------------------------------------------------

_DEBIT_CSV_BYTES = (
    b"Following data is valid as of 20260330233350 (Year/Month/Day/Hour/Minute/Second)\n"
    b"\n"
    b"First Bank Card,Transaction Type,Date Posted, Transaction Amount,Description\n"
    b"\n"
    b"\n"
    b"'5510000000000000',DEBIT,20260115,-85.50,TEST GROCERY STORE\n"
    b"'5510000000000000',CREDIT,20260118,2000.00,TEST EMPLOYER PAY/PAY\n"
    b"'5510000000000000',DEBIT,20260120,-13.04,TEST SUBSCRIPTION SERVICE\n"
    # Second section with a repeated header (mirrors real BMO debit file layout)
    b"\n"
    b"First Bank Card,Transaction Type,Date Posted, Transaction Amount,Description\n"
    b"\n"
    b"\n"
    b"'5510000000000000',CREDIT,20260101,200.00,TEST SAVINGS TF\n"
)


@pytest.fixture
def debit_parser() -> BMODebitParser:
    return BMODebitParser()


@pytest.fixture
def debit_sample_row() -> dict:
    """A single normalized row (keys already stripped) matching the debit format."""
    return {
        "First Bank Card": "'5510000000000000'",
        "Transaction Type": "DEBIT",
        "Date Posted": "20260115",
        "Transaction Amount": "-85.50",
        "Description": "TEST GROCERY STORE",
    }


class TestBMODebitParser:
    def test_parse_row_date(self, debit_parser, debit_sample_row):
        result = debit_parser.parse_row(debit_sample_row)
        assert result.transaction_date == date(2026, 1, 15)
        assert result.posted_date == date(2026, 1, 15)

    def test_parse_row_currency_is_cad(self, debit_parser, debit_sample_row):
        result = debit_parser.parse_row(debit_sample_row)
        assert result.currency == "CAD"

    def test_parse_row_debit_is_negative(self, debit_parser, debit_sample_row):
        """CSV debit amount is already negative — stored as-is."""
        result = debit_parser.parse_row(debit_sample_row)
        assert result.amount == Decimal("-85.50")

    def test_parse_row_credit_is_positive(self, debit_parser, debit_sample_row):
        """CSV credit amount is already positive — stored as-is."""
        debit_sample_row["Transaction Type"] = "CREDIT"
        debit_sample_row["Transaction Amount"] = "2000.00"
        result = debit_parser.parse_row(debit_sample_row)
        assert result.amount == Decimal("2000.00")

    def test_parse_row_description(self, debit_parser, debit_sample_row):
        result = debit_parser.parse_row(debit_sample_row)
        assert result.merchant_raw == "TEST GROCERY STORE"
        assert result.description == "TEST GROCERY STORE"

    def test_parse_row_external_id_is_md5(self, debit_parser, debit_sample_row):
        result = debit_parser.parse_row(debit_sample_row)
        assert result.external_id is not None
        assert len(result.external_id) == 32

    def test_parse_row_external_id_stable(self, debit_parser, debit_sample_row):
        r1 = debit_parser.parse_row(debit_sample_row)
        r2 = debit_parser.parse_row(debit_sample_row)
        assert r1.external_id == r2.external_id

    def test_parse_row_invalid_date_raises(self, debit_parser, debit_sample_row):
        debit_sample_row["Date Posted"] = "not-a-date"
        with pytest.raises(ValueError, match="Invalid Date Posted"):
            debit_parser.parse_row(debit_sample_row)

    def test_parse_row_invalid_amount_raises(self, debit_parser, debit_sample_row):
        debit_sample_row["Transaction Amount"] = "abc"
        with pytest.raises(ValueError, match="Invalid Transaction Amount"):
            debit_parser.parse_row(debit_sample_row)

    def test_registry_registered(self):
        assert isinstance(registry.get("bmo_debit"), BMODebitParser)

    def test_registry_list_includes_bmo_debit(self):
        assert any(s["key"] == "bmo_debit" for s in registry.list_sources())


class TestBMODebitParserCsv:
    def test_parse_csv_row_count(self):
        """All rows across both sections are parsed."""
        parser = BMODebitParser()
        results = parser.parse_csv(_DEBIT_CSV_BYTES)
        assert len(results) == 4

    def test_parse_csv_all_succeed(self):
        parser = BMODebitParser()
        results = parser.parse_csv(_DEBIT_CSV_BYTES)
        for _, _, result in results:
            assert not isinstance(result, Exception), str(result)

    def test_parse_csv_first_row_values(self):
        parser = BMODebitParser()
        _, _, row = parser.parse_csv(_DEBIT_CSV_BYTES)[0]
        assert row.transaction_date == date(2026, 1, 15)
        assert row.amount == Decimal("-85.50")
        assert row.merchant_raw == "TEST GROCERY STORE"
        assert row.currency == "CAD"

    def test_parse_csv_credit_row(self):
        parser = BMODebitParser()
        _, _, row = parser.parse_csv(_DEBIT_CSV_BYTES)[1]
        assert row.amount == Decimal("2000.00")
        assert row.merchant_raw == "TEST EMPLOYER PAY/PAY"

    def test_parse_csv_second_section_included(self):
        """Rows from the repeated-header second section are also parsed."""
        parser = BMODebitParser()
        _, _, row = parser.parse_csv(_DEBIT_CSV_BYTES)[3]
        assert row.transaction_date == date(2026, 1, 1)
        assert row.amount == Decimal("200.00")

    def test_parse_csv_strips_leading_space_in_amount_column(self):
        """The real header has ' Transaction Amount' — keys must be stripped."""
        parser = BMODebitParser()
        results = parser.parse_csv(_DEBIT_CSV_BYTES)
        # If stripping failed, all rows would raise on amount parsing
        assert all(not isinstance(r, Exception) for _, _, r in results)

    def test_parse_csv_handles_bom(self):
        bom_bytes = b"\xef\xbb\xbf" + _DEBIT_CSV_BYTES
        parser = BMODebitParser()
        results = parser.parse_csv(bom_bytes)
        assert len(results) == 4

    def test_parse_csv_missing_header_raises(self):
        parser = BMODebitParser()
        with pytest.raises(ValueError, match="Could not find BMO Debit CSV header row"):
            parser.parse_csv(b"no header here\njust garbage\n")
