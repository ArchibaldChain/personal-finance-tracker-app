import json
import logging

from app.services.classification.base import BaseClassifier
from app.services.classification.cache import get_cached, set_cached

logger = logging.getLogger(__name__)

SINGLE_PASS_MAX_CATEGORIES = 30
SINGLE_PASS_MAX_SUBCATEGORIES = 100

_SYSTEM_PROMPT = """You are a financial transaction categorizer. Your job is to classify a bank transaction into exactly one category and one subcategory from the provided list.

Rules:
- You MUST select a category_index from the numbered list.
- Select the best matching subcategory_index. If none of the subcategories fit, use -1.
- Do NOT invent new categories or subcategories.
- Choose the best possible match. If ambiguous, pick the most common interpretation.
- Return ONLY a JSON object. No explanation, no markdown, no extra keys.

Response format:
{"category_index": <int>, "subcategory_index": <int or -1>, "confidence": <float 0.0-1.0>}"""

_SYSTEM_PROMPT_PASS1 = """You are a financial transaction categorizer. Your job is to classify a bank transaction into exactly one category from the provided list.

Rules:
- You MUST select a category_index from the numbered list.
- Do NOT invent new categories.
- Choose the best possible match.
- Return ONLY a JSON object. No explanation, no markdown, no extra keys.

Response format:
{"category_index": <int>, "confidence": <float 0.0-1.0>}"""

_SYSTEM_PROMPT_PASS2 = """You are a financial transaction categorizer. Your job is to select the best subcategory for a transaction given its category.

Rules:
- Select the best matching subcategory_index from the numbered list. If none of the subcategories fit, use -1.
- Do NOT invent new subcategories.
- Choose the best possible match.
- Return ONLY a JSON object. No explanation, no markdown, no extra keys.

Response format:
{"subcategory_index": <int or -1>, "confidence": <float 0.0-1.0>}"""

_FALLBACK: dict = {"category": None, "subcategory": None, "confidence": 0.0}


class LLMClassifier(BaseClassifier):
    """OpenAI-based transaction classifier using gpt-4o-mini.

    Uses index-based output to avoid hallucinated category name variations.
    Automatically switches to a two-pass approach when the category tree is large.
    Results are cached in memory by (normalized_description, tree_hash).
    """

    def __init__(
        self,
        api_key: str,
        model: str = "gpt-4o-mini",
        temperature: float = 0.0,
    ) -> None:
        import openai  # deferred so app starts without openai installed

        self._client = openai.OpenAI(api_key=api_key)
        self._model = model
        self._temperature = temperature

    def classify(self, description: str, category_tree: dict[str, list[str]]) -> dict:
        cached = get_cached(description, category_tree)
        if cached is not None:
            return cached

        if not category_tree:
            return _FALLBACK

        try:
            if self._should_use_two_pass(category_tree):
                result = self._classify_two_pass(description, category_tree)
            else:
                result = self._classify_single_pass(description, category_tree)
        except Exception as e:
            logger.warning("LLM classification failed for %r: %s", description, e)
            result = _FALLBACK

        set_cached(description, result)
        return result

    def _should_use_two_pass(self, category_tree: dict[str, list[str]]) -> bool:
        total_subcats = sum(len(v) for v in category_tree.values())
        return (
            len(category_tree) > SINGLE_PASS_MAX_CATEGORIES
            or total_subcats > SINGLE_PASS_MAX_SUBCATEGORIES
        )

    def _classify_single_pass(
        self, description: str, category_tree: dict[str, list[str]]
    ) -> dict:
        categories_list = list(category_tree.keys())
        user_prompt = (
            f'Transaction description: "{description}"\n\n'
            f"Available categories and subcategories:\n"
            f"{self._build_category_block(category_tree)}\n\n"
            f"Return the JSON object now."
        )
        raw = self._call_llm(_SYSTEM_PROMPT, user_prompt)
        return self._validate_and_resolve(raw, category_tree, categories_list)

    def _classify_two_pass(
        self, description: str, category_tree: dict[str, list[str]]
    ) -> dict:
        categories_list = list(category_tree.keys())

        # Pass 1 — pick category
        cat_block = "\n".join(f"[{i}] {name}" for i, name in enumerate(categories_list))
        pass1_prompt = (
            f'Transaction description: "{description}"\n\n'
            f"Available categories:\n{cat_block}\n\n"
            f"Return the JSON object now."
        )
        raw1 = self._call_llm(_SYSTEM_PROMPT_PASS1, pass1_prompt)

        cat_idx = raw1.get("category_index")
        if not isinstance(cat_idx, int) or cat_idx < 0 or cat_idx >= len(categories_list):
            return _FALLBACK
        resolved_category = categories_list[cat_idx]
        confidence1 = max(0.0, min(1.0, float(raw1.get("confidence", 0.0))))

        # Pass 2 — pick subcategory within resolved category
        subcats = category_tree[resolved_category]
        sub_block = "\n".join(f"[{i}] {name}" for i, name in enumerate(subcats))
        pass2_prompt = (
            f'Transaction description: "{description}"\n'
            f"Category: {resolved_category}\n\n"
            f"Available subcategories:\n{sub_block}\n\n"
            f"Return the JSON object now."
        )
        try:
            raw2 = self._call_llm(_SYSTEM_PROMPT_PASS2, pass2_prompt)
        except Exception as e:
            logger.warning("LLM pass 2 failed for %r: %s", description, e)
            return {"category": resolved_category, "subcategory": None, "confidence": confidence1 * 0.5}

        sub_idx = raw2.get("subcategory_index")
        confidence2 = max(0.0, min(1.0, float(raw2.get("confidence", 0.0))))

        if not isinstance(sub_idx, int):
            return {"category": resolved_category, "subcategory": None, "confidence": confidence1 * 0.5}
        if sub_idx == -1:
            return {"category": resolved_category, "subcategory": None, "confidence": confidence1 * confidence2}
        if sub_idx < 0 or sub_idx >= len(subcats):
            return {"category": resolved_category, "subcategory": None, "confidence": confidence1 * 0.5}

        return {
            "category": resolved_category,
            "subcategory": subcats[sub_idx],
            "confidence": confidence1 * confidence2,
        }

    def _call_llm(self, system_prompt: str, user_prompt: str) -> dict:
        response = self._client.chat.completions.create(
            model=self._model,
            temperature=self._temperature,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        return json.loads(response.choices[0].message.content)

    def _validate_and_resolve(
        self,
        raw_response: dict,
        category_tree: dict[str, list[str]],
        categories_list: list[str],
    ) -> dict:
        confidence = max(0.0, min(1.0, float(raw_response.get("confidence", 0.0))))

        cat_idx = raw_response.get("category_index")
        if not isinstance(cat_idx, int) or cat_idx < 0 or cat_idx >= len(categories_list):
            return _FALLBACK

        resolved_category = categories_list[cat_idx]
        subcats = category_tree[resolved_category]

        sub_idx = raw_response.get("subcategory_index")
        if not isinstance(sub_idx, int):
            return {"category": resolved_category, "subcategory": None, "confidence": confidence * 0.5}
        if sub_idx == -1:
            return {"category": resolved_category, "subcategory": None, "confidence": confidence}
        if sub_idx < 0 or sub_idx >= len(subcats):
            return {"category": resolved_category, "subcategory": None, "confidence": confidence * 0.5}

        return {
            "category": resolved_category,
            "subcategory": subcats[sub_idx],
            "confidence": confidence,
        }

    def _build_category_block(self, category_tree: dict[str, list[str]]) -> str:
        lines = []
        for cat_idx, (cat_name, subcats) in enumerate(category_tree.items()):
            lines.append(f"[{cat_idx}] {cat_name}")
            for sub_idx, sub_name in enumerate(subcats):
                lines.append(f"    [{sub_idx}] {sub_name}")
        return "\n".join(lines)
