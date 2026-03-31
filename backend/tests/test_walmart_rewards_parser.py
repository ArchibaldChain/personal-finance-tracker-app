import io
from datetime import date
from decimal import Decimal
from pathlib import Path

import pytest

from app.parsers.registry import registry
from app.parsers.walmart_rewards_parser import WalmartRewardsParser

# Path to a real CSV file for integration-style tests (not committed to repo)
SAMPLE_CSV = (
    Path(__file__).parent.parent
    / "sample_data"
    / "walmart_rewards_sample.csv"
)


@pytest.fixture
def parser() -> WalmartRewardsParser:
    return WalmartRewardsParser()


@pytest.fixture
def sample_row() -> dict:
    """A single representative row matching the Walmart Rewards CSV format."""
    return {
        "Date": "2026-01-15",
        "Posted Date": "2026-01-16",
        "Reference Number": '"""10000000000000000000001"""',
        "Activity Type": "TRANS",
        "Status": "APPROVED",
        "Transaction Card Number": "************0000",
        "Merchant Category": "Parking Lots and Garages",
        "Merchant Name": "TEST PARKING CO",
        "Merchant City": "TESTVILLE",
        "Merchant State/Province": "ON",
        "Merchant Country": "CAN",
        "Merchant Postal Code/Zip": "A1B 2C3",
        "Amount": "$3.85",
        "Rewards": "",
        "Name on Card": "TEST USER",
    }


class TestWalmartRewardsParser:
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
        assert result.amount == Decimal("-3.85")

    def test_parse_row_payment_becomes_positive(self, parser, sample_row):
        """CSV negative = payment/credit → stored as positive."""
        sample_row["Amount"] = "-$1,380.96"
        result = parser.parse_row(sample_row)
        assert result.amount == Decimal("1380.96")

    def test_parse_row_refund_becomes_positive(self, parser, sample_row):
        """CSV negative = refund → stored as positive."""
        sample_row["Amount"] = "-$28.24"
        result = parser.parse_row(sample_row)
        assert result.amount == Decimal("28.24")

    def test_parse_row_amount_with_comma(self, parser, sample_row):
        sample_row["Amount"] = "$1,234.56"
        result = parser.parse_row(sample_row)
        assert result.amount == Decimal("-1234.56")

    def test_parse_row_reference_number_stripped(self, parser, sample_row):
        """Triple-quoted reference numbers are cleaned up."""
        result = parser.parse_row(sample_row)
        assert result.external_id == "10000000000000000000001"
        assert '"' not in result.external_id

    def test_parse_row_merchant_raw(self, parser, sample_row):
        result = parser.parse_row(sample_row)
        assert result.merchant_raw == "TEST PARKING CO"

    def test_parse_row_description_includes_city_and_country(self, parser, sample_row):
        result = parser.parse_row(sample_row)
        assert "TEST PARKING CO" in result.description
        assert "TESTVILLE" in result.description
        assert "CAN" in result.description

    def test_parse_row_notes_contains_mcc(self, parser, sample_row):
        result = parser.parse_row(sample_row)
        assert result.notes is not None
        assert "Parking Lots and Garages" in result.notes

    def test_parse_row_empty_merchant_category(self, parser, sample_row):
        """Payment rows have no merchant category — notes should be None."""
        sample_row["Merchant Category"] = ""
        sample_row["Amount"] = "-$1,380.96"
        result = parser.parse_row(sample_row)
        assert result.notes is None

    def test_parse_row_invalid_date_raises(self, parser, sample_row):
        sample_row["Date"] = "not-a-date"
        with pytest.raises(ValueError, match="Invalid Date"):
            parser.parse_row(sample_row)

    def test_parse_row_invalid_amount_raises(self, parser, sample_row):
        sample_row["Amount"] = "$abc"
        with pytest.raises(ValueError, match="Invalid Amount"):
            parser.parse_row(sample_row)

    def test_parse_row_fallback_external_id_when_no_ref(self, parser, sample_row):
        """When reference number is empty, a hash-based external_id is generated."""
        sample_row["Reference Number"] = ""
        result = parser.parse_row(sample_row)
        assert result.external_id is not None
        assert len(result.external_id) == 32  # MD5 hex

    def test_registry_registered(self):
        parser = registry.get("walmart_rewards")
        assert isinstance(parser, WalmartRewardsParser)

    def test_registry_list_includes_walmart(self):
        assert "walmart_rewards" in registry.list_sources()


class TestWalmartRewardsParserCsv:
    """Tests using a minimal inline CSV to verify full parse_csv() flow."""

    CSV_BYTES = (
        b"\xef\xbb\xbf"  # BOM
        b'"Date","Posted Date","Reference Number","Activity Type","Status",'
        b'"Transaction Card Number","Merchant Category","Merchant Name",'
        b'"Merchant City","Merchant State/Province","Merchant Country",'
        b'"Merchant Postal Code/Zip","Amount","Rewards","Name on Card"\n'
        b'"2026-01-15","2026-01-16","""10000000000000000000001""","TRANS","APPROVED",'
        b'"************0000","Parking Lots and Garages","TEST PARKING CO",'
        b'"TESTVILLE","ON","CAN","A1B 2C3","$3.85","","TEST USER"\n'
        b'"2026-01-10","2026-01-11","""10000000000000000000002""","TRANS","APPROVED",'
        b'"************0000","Quick Payment Service-Fast Food Restaurants","TEST RESTAURANT",'
        b'"TESTVILLE","ON","CAN","A1B 2C3","$10.16","","TEST USER"\n'
        b'"2026-01-05","2026-01-05","""10000000000000000000003""","TRANS","APPROVED",'
        b'"************0000","","PAYMENT - THANK YOU","","","","","-$1,380.96","","TEST USER"\n'
    )

    def test_parse_csv_row_count(self):
        parser = WalmartRewardsParser()
        results = parser.parse_csv(self.CSV_BYTES)
        assert len(results) == 3

    def test_parse_csv_all_succeed(self):
        parser = WalmartRewardsParser()
        results = parser.parse_csv(self.CSV_BYTES)
        for _, _, result in results:
            assert not isinstance(result, Exception), str(result)

    def test_parse_csv_first_row_values(self):
        parser = WalmartRewardsParser()
        results = parser.parse_csv(self.CSV_BYTES)
        _, _, row = results[0]
        assert row.transaction_date == date(2026, 1, 15)
        assert row.amount == Decimal("-3.85")
        assert row.merchant_raw == "TEST PARKING CO"
        assert row.currency == "CAD"

    def test_parse_csv_payment_row(self):
        parser = WalmartRewardsParser()
        results = parser.parse_csv(self.CSV_BYTES)
        _, _, payment = results[2]
        assert payment.amount == Decimal("1380.96")
        assert payment.merchant_raw == "PAYMENT - THANK YOU"

    def test_parse_csv_handles_bom(self):
        """Verifies UTF-8 BOM is stripped and first column parses correctly."""
        parser = WalmartRewardsParser()
        results = parser.parse_csv(self.CSV_BYTES)
        assert len(results) == 3  # would fail if BOM corrupts the header


class TestWalmartRewardsRealFile:
    """Smoke test against a real CSV if present locally (not committed to repo)."""

    def test_real_file_parses_without_errors(self):
        if not SAMPLE_CSV.exists():
            pytest.skip("Real Walmart CSV not present")
        parser = WalmartRewardsParser()
        results = parser.parse_csv(SAMPLE_CSV.read_bytes())
        assert len(results) > 0
        failures = [(i, raw, err) for i, raw, err in results if isinstance(err, Exception)]
        assert failures == [], f"Parse failures: {failures}"

    def test_real_file_all_amounts_non_zero(self):
        if not SAMPLE_CSV.exists():
            pytest.skip("Real Walmart CSV not present")
        parser = WalmartRewardsParser()
        results = parser.parse_csv(SAMPLE_CSV.read_bytes())
        for _, raw, result in results:
            if not isinstance(result, Exception):
                assert result.amount != Decimal("0"), f"Zero amount for row: {raw}"