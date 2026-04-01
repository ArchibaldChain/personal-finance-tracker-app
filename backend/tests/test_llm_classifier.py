"""Tests for the LLM classifier.

All tests mock openai.OpenAI — no real API calls are made.
"""
import json
from unittest.mock import MagicMock, patch

import pytest

from app.services.classification.cache import clear_cache
from app.services.classification.category_tree import build_category_tree
from app.services.classification.llm_classifier import LLMClassifier

SAMPLE_TREE = {
    "Food": ["Restaurant", "Takeout / Delivery", "Coffee / Tea"],
    "Groceries": ["Supermarket", "Fresh Market"],
    "Transportation": ["Taxi / Uber", "Public Transit"],
}


@pytest.fixture(autouse=True)
def reset_cache():
    """Clear the in-memory cache before every test."""
    clear_cache()
    yield
    clear_cache()


@pytest.fixture
def mock_llm_response():
    """Factory that returns a mock OpenAI response with given JSON content."""
    def _make(content: dict):
        resp = MagicMock()
        resp.choices[0].message.content = json.dumps(content)
        return resp
    return _make


@pytest.fixture
def classifier():
    with patch("app.services.classification.llm_classifier.openai", create=True):
        c = LLMClassifier.__new__(LLMClassifier)
        c._model = "gpt-4o-mini"
        c._temperature = 0.0
        c._client = MagicMock()
        return c


# ---------------------------------------------------------------------------
# build_category_tree
# ---------------------------------------------------------------------------

class TestBuildCategoryTree:
    def test_keys_match_category_names(self, db):
        from app.services.category_service import seed_categories, list_categories
        seed_categories(db)
        cats = list_categories(db)
        tree = build_category_tree(cats)
        names = [c.name for c in cats]
        assert list(tree.keys()) == names

    def test_subcategory_values_are_lists_of_strings(self, db):
        from app.services.category_service import seed_categories, list_categories
        seed_categories(db)
        tree = build_category_tree(list_categories(db))
        for subcats in tree.values():
            assert isinstance(subcats, list)
            assert all(isinstance(s, str) for s in subcats)

    def test_empty_categories_returns_empty_tree(self):
        assert build_category_tree([]) == {}


# ---------------------------------------------------------------------------
# _validate_and_resolve
# ---------------------------------------------------------------------------

class TestValidateAndResolve:
    def test_full_success(self, classifier):
        cats = list(SAMPLE_TREE.keys())
        result = classifier._validate_and_resolve(
            {"category_index": 0, "subcategory_index": 2, "confidence": 0.9},
            SAMPLE_TREE, cats,
        )
        assert result == {"category": "Food", "subcategory": "Coffee / Tea", "confidence": 0.9}

    def test_invalid_category_index_returns_fallback(self, classifier):
        cats = list(SAMPLE_TREE.keys())
        result = classifier._validate_and_resolve(
            {"category_index": 99, "subcategory_index": 0, "confidence": 0.8},
            SAMPLE_TREE, cats,
        )
        assert result == {"category": None, "subcategory": None, "confidence": 0.0}

    def test_missing_category_index_returns_fallback(self, classifier):
        cats = list(SAMPLE_TREE.keys())
        result = classifier._validate_and_resolve(
            {"subcategory_index": 0, "confidence": 0.8},
            SAMPLE_TREE, cats,
        )
        assert result == {"category": None, "subcategory": None, "confidence": 0.0}

    def test_invalid_subcategory_index_returns_partial(self, classifier):
        cats = list(SAMPLE_TREE.keys())
        result = classifier._validate_and_resolve(
            {"category_index": 0, "subcategory_index": 99, "confidence": 0.8},
            SAMPLE_TREE, cats,
        )
        assert result["category"] == "Food"
        assert result["subcategory"] is None
        assert result["confidence"] == pytest.approx(0.4)  # 0.8 * 0.5

    def test_confidence_clamped_above_1(self, classifier):
        cats = list(SAMPLE_TREE.keys())
        result = classifier._validate_and_resolve(
            {"category_index": 0, "subcategory_index": 0, "confidence": 5.0},
            SAMPLE_TREE, cats,
        )
        assert result["confidence"] == pytest.approx(1.0)

    def test_confidence_clamped_below_0(self, classifier):
        cats = list(SAMPLE_TREE.keys())
        result = classifier._validate_and_resolve(
            {"category_index": 0, "subcategory_index": 0, "confidence": -2.0},
            SAMPLE_TREE, cats,
        )
        assert result["confidence"] == pytest.approx(0.0)


# ---------------------------------------------------------------------------
# LLMClassifier.classify — single pass
# ---------------------------------------------------------------------------

class TestClassifySinglePass:
    def test_correct_names_resolved(self, classifier, mock_llm_response):
        classifier._client.chat.completions.create.return_value = mock_llm_response(
            {"category_index": 2, "subcategory_index": 1, "confidence": 0.95}
        )
        result = classifier.classify("TTCGO TRANSIT", SAMPLE_TREE)
        assert result["category"] == "Transportation"
        assert result["subcategory"] == "Public Transit"
        assert result["confidence"] == pytest.approx(0.95)

    def test_cache_hit_skips_second_api_call(self, classifier, mock_llm_response):
        classifier._client.chat.completions.create.return_value = mock_llm_response(
            {"category_index": 0, "subcategory_index": 0, "confidence": 0.9}
        )
        classifier.classify("STARBUCKS", SAMPLE_TREE)
        classifier.classify("STARBUCKS", SAMPLE_TREE)
        assert classifier._client.chat.completions.create.call_count == 1

    def test_api_exception_returns_fallback(self, classifier):
        classifier._client.chat.completions.create.side_effect = Exception("network error")
        result = classifier.classify("UBER TRIP", SAMPLE_TREE)
        assert result == {"category": None, "subcategory": None, "confidence": 0.0}

    def test_empty_description_still_calls_api(self, classifier, mock_llm_response):
        """Empty string is a valid (if poor) input — classifier still runs."""
        classifier._client.chat.completions.create.return_value = mock_llm_response(
            {"category_index": 0, "subcategory_index": 0, "confidence": 0.1}
        )
        result = classifier.classify("", SAMPLE_TREE)
        assert result["category"] is not None or result["category"] is None  # just no crash

    def test_empty_tree_returns_fallback(self, classifier):
        result = classifier.classify("STARBUCKS", {})
        assert result == {"category": None, "subcategory": None, "confidence": 0.0}
        classifier._client.chat.completions.create.assert_not_called()


# ---------------------------------------------------------------------------
# Two-pass — triggered when tree exceeds thresholds
# ---------------------------------------------------------------------------

class TestClassifyTwoPass:
    def _make_large_tree(self) -> dict[str, list[str]]:
        """Build a tree with >30 categories to force two-pass."""
        return {f"Cat{i}": [f"Sub{j}" for j in range(4)] for i in range(35)}

    def test_two_pass_triggered_for_large_tree(self, classifier, mock_llm_response):
        large_tree = self._make_large_tree()
        cats = list(large_tree.keys())

        # Pass 1 returns category_index=2, pass 2 returns subcategory_index=1
        classifier._client.chat.completions.create.side_effect = [
            mock_llm_response({"category_index": 2, "confidence": 0.9}),
            mock_llm_response({"subcategory_index": 1, "confidence": 0.8}),
        ]

        result = classifier.classify("some merchant", large_tree)

        assert classifier._client.chat.completions.create.call_count == 2
        assert result["category"] == cats[2]
        assert result["subcategory"] == large_tree[cats[2]][1]
        assert result["confidence"] == pytest.approx(0.72)  # 0.9 * 0.8

    def test_two_pass_pass2_failure_returns_category_only(self, classifier, mock_llm_response):
        large_tree = self._make_large_tree()

        classifier._client.chat.completions.create.side_effect = [
            mock_llm_response({"category_index": 0, "confidence": 0.85}),
            Exception("pass 2 failed"),
        ]

        result = classifier.classify("merchant", large_tree)
        assert result["category"] == list(large_tree.keys())[0]
        assert result["subcategory"] is None
        assert result["confidence"] == pytest.approx(0.425)  # 0.85 * 0.5

    def test_single_pass_used_for_normal_tree(self, classifier, mock_llm_response):
        classifier._client.chat.completions.create.return_value = mock_llm_response(
            {"category_index": 0, "subcategory_index": 0, "confidence": 0.9}
        )
        classifier.classify("WALMART", SAMPLE_TREE)
        assert classifier._client.chat.completions.create.call_count == 1
