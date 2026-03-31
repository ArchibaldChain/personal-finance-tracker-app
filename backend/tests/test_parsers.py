from datetime import date
from decimal import Decimal

import pytest

from app.parsers.bofa_parser import BofAParser
from app.parsers.chase_parser import ChaseParser
from app.parsers.registry import ParserRegistry, registry


class TestChaseParser:
    def test_parse_row_valid(self):
        parser = ChaseParser()
        raw = {
            "Transaction Date": "01/15/2026",
            "Post Date": "01/16/2026",
            "Description": "STARBUCKS #123",
            "Category": "Food & Drink",
            "Type": "Sale",
            "Amount": "-5.75",
            "Memo": "",
        }
        result = parser.parse_row(raw)
        assert result.transaction_date == date(2026, 1, 15)
        assert result.posted_date == date(2026, 1, 16)
        assert result.amount == Decimal("-5.75")
        assert result.merchant_raw == "STARBUCKS #123"
        assert result.description == "STARBUCKS #123"
        assert result.external_id is not None

    def test_parse_row_negative_amount_is_expense(self):
        parser = ChaseParser()
        raw = {
            "Transaction Date": "01/15/2026",
            "Post Date": "01/16/2026",
            "Description": "COFFEE SHOP",
            "Category": "",
            "Type": "Sale",
            "Amount": "-12.50",
            "Memo": "",
        }
        result = parser.parse_row(raw)
        assert result.amount < 0

    def test_parse_row_positive_amount_is_credit(self):
        parser = ChaseParser()
        raw = {
            "Transaction Date": "01/20/2026",
            "Post Date": "01/21/2026",
            "Description": "PAYCHECK",
            "Category": "Income",
            "Type": "ACH Credit",
            "Amount": "2500.00",
            "Memo": "Direct Deposit",
        }
        result = parser.parse_row(raw)
        assert result.amount > 0
        assert result.notes == "Direct Deposit"

    def test_parse_row_invalid_date_raises(self):
        parser = ChaseParser()
        raw = {
            "Transaction Date": "not-a-date",
            "Post Date": "",
            "Description": "MERCHANT",
            "Amount": "-5.00",
            "Memo": "",
        }
        with pytest.raises(ValueError, match="Invalid Transaction Date"):
            parser.parse_row(raw)

    def test_parse_row_invalid_amount_raises(self):
        parser = ChaseParser()
        raw = {
            "Transaction Date": "01/15/2026",
            "Post Date": "",
            "Description": "MERCHANT",
            "Amount": "not-a-number",
            "Memo": "",
        }
        with pytest.raises(ValueError, match="Invalid Amount"):
            parser.parse_row(raw)

    def test_parse_csv_returns_all_rows(self, chase_csv_bytes):
        parser = ChaseParser()
        results = parser.parse_csv(chase_csv_bytes)
        assert len(results) == 3
        # All should be successes
        for row_index, raw, result in results:
            assert not isinstance(result, Exception)

    def test_parse_csv_external_id_is_stable(self, chase_csv_bytes):
        parser = ChaseParser()
        results1 = parser.parse_csv(chase_csv_bytes)
        results2 = parser.parse_csv(chase_csv_bytes)
        ids1 = [r.external_id for _, _, r in results1]
        ids2 = [r.external_id for _, _, r in results2]
        assert ids1 == ids2

    def test_parse_csv_captures_failed_row(self):
        parser = ChaseParser()
        bad_csv = (
            b"Transaction Date,Post Date,Description,Category,Type,Amount,Memo\n"
            b"INVALID_DATE,01/16/2026,COFFEE,-5.00,Sale,,\n"
        )
        results = parser.parse_csv(bad_csv)
        assert len(results) == 1
        _, _, result = results[0]
        assert isinstance(result, Exception)


class TestBofAParser:
    def test_parse_row_valid(self):
        parser = BofAParser()
        raw = {
            "Date": "01/15/2026",
            "Description": "STARBUCKS",
            "Amount": "-6.25",
            "Running Bal.": "1000.00",
        }
        result = parser.parse_row(raw)
        assert result.transaction_date == date(2026, 1, 15)
        assert result.amount == Decimal("-6.25")
        assert result.merchant_raw == "STARBUCKS"

    def test_parse_csv_skips_header_rows(self, bofa_csv_bytes):
        parser = BofAParser()
        results = parser.parse_csv(bofa_csv_bytes)
        assert len(results) == 3
        for _, _, result in results:
            assert not isinstance(result, Exception)

    def test_parse_csv_first_row_correct(self, bofa_csv_bytes):
        parser = BofAParser()
        results = parser.parse_csv(bofa_csv_bytes)
        _, _, first = results[0]
        assert first.transaction_date == date(2026, 1, 15)
        assert first.amount == Decimal("-6.25")

    def test_parse_csv_missing_header_raises(self):
        parser = BofAParser()
        bad_csv = b"This file has no date column\nJust garbage\n"
        with pytest.raises(ValueError, match="Could not find BofA CSV header"):
            parser.parse_csv(bad_csv)


class TestRegistry:
    def test_get_registered_source_returns_instance(self):
        parser = registry.get("chase")
        assert isinstance(parser, ChaseParser)

    def test_get_bofa_returns_instance(self):
        parser = registry.get("bofa")
        assert isinstance(parser, BofAParser)

    def test_get_case_insensitive(self):
        parser = registry.get("CHASE")
        assert isinstance(parser, ChaseParser)

    def test_get_unknown_raises_value_error(self):
        with pytest.raises(ValueError, match="Unknown source"):
            registry.get("nonexistent_bank")

    def test_list_sources_includes_both(self):
        sources = registry.list_sources()
        assert "chase" in sources
        assert "bofa" in sources

    def test_custom_registry_is_independent(self):
        custom = ParserRegistry()
        custom.register("test", ChaseParser)
        assert "test" in custom.list_sources()
        assert "test" not in registry.list_sources()
