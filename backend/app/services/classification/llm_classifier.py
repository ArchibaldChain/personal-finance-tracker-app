import json
import logging

from app.constants.transaction_type import TransactionType
from app.services.classification.base import BaseClassifier
from app.services.classification.cache import get_cached, set_cached
from app.services.classification.utils import resolve_transaction_type as _resolve_transaction_type

logger = logging.getLogger(__name__)

SINGLE_PASS_MAX_CATEGORIES = 30
SINGLE_PASS_MAX_SUBCATEGORIES = 100

_TRANSACTION_TYPE_RULES = """
Transaction type definitions — you MUST choose one of: "expense", "income", "transfer"

TRANSFER — money moving between accounts, not a real gain or loss:
  - Account transfers (internal, external, between own accounts)
  - E-transfers sent or RECEIVED
  - Credit card payments
  - Investment transfers (e.g. moving money to a brokerage)
  - Receiving a transfer from another person (positive amount)

INCOME — genuine earnings or entitlements:
  - Salary, wages, payroll deposits
  - Interest earned on savings/investments
  - Government benefits, tax refunds, grants
  - Cashback rewards credited as cash

EXPENSE — spending or cost, including offsets:
  - Any purchase, bill, subscription, fee (typically negative amount)
  - Merchandise returns and refunds (positive amount) — these offset expenses,
    do NOT classify as income
  - Rewards redeemed as a discount on a purchase

POSITIVE AMOUNT DISAMBIGUATION — when the amount is positive, pick by context:
  - Received from another person/account → transfer
  - Return / refund on a purchase → expense
  - Salary / interest / benefit → income
""".strip()

_SYSTEM_PROMPT = f"""You are a financial transaction categorizer.
Your job is to classify a bank transaction into a transaction_type, one category, and one subcategory.

{_TRANSACTION_TYPE_RULES}

Category rules:
- You MUST select a category_index from the numbered list.
- The listed categories already have an assigned type shown in brackets — prefer consistency, but override if the transaction clearly belongs to a different type.
- Select the best matching subcategory_index. If none fit, use -1.
- Do NOT invent new categories or subcategories.
- Return ONLY a JSON object. No explanation, no markdown, no extra keys.

Response format:
{{"transaction_type": "expense|income|transfer", "category_index": <int>, "subcategory_index": <int or -1>, "confidence": <float 0.0-1.0>}}"""

_SYSTEM_PROMPT_PASS1 = f"""You are a financial transaction categorizer.
Your job is to classify a bank transaction into a transaction_type and one category.

{_TRANSACTION_TYPE_RULES}

Category rules:
- You MUST select a category_index from the numbered list.
- The listed categories already have an assigned type shown in brackets — prefer consistency, but override if the transaction clearly belongs to a different type.
- Do NOT invent new categories.
- Return ONLY a JSON object. No explanation, no markdown, no extra keys.

Response format:
{{"transaction_type": "expense|income|transfer", "category_index": <int>, "confidence": <float 0.0-1.0>}}"""

_SYSTEM_PROMPT_PASS1_TYPED = """You are a financial transaction categorizer.
The transaction type has already been determined. Your only job is to pick the best category.

Category rules:
- You MUST select a category_index from the numbered list.
- Do NOT invent new categories.
- Return ONLY a JSON object. No explanation, no markdown, no extra keys.

Response format:
{"category_index": <int>, "confidence": <float 0.0-1.0>}"""

_SYSTEM_PROMPT_PASS2 = """You are a financial transaction categorizer.
Your job is to select the best subcategory for a transaction given its category.

Rules:
- Select the best matching subcategory_index from the numbered list. If none fit, use -1.
- Do NOT invent new subcategories.
- Return ONLY a JSON object. No explanation, no markdown, no extra keys.

Response format:
{"subcategory_index": <int or -1>, "confidence": <float 0.0-1.0>}"""

_VALID_TYPES = {"expense", "income", "transfer"}
_FALLBACK: dict = {"transaction_type": None, "category": None, "subcategory": None, "confidence": 0.0}


class LLMClassifier(BaseClassifier):
    """OpenAI-based transaction classifier using gpt-4o-mini.

    Uses index-based output to avoid hallucinated category name variations.
    The LLM decides transaction_type directly from the description and amount context.
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

    def classify(
        self,
        description: str,
        category_tree: dict[str, list[str]],
        category_type_map: dict[str, str] | None = None,
        forced_type: TransactionType | None = None,
    ) -> dict:
        cache_key = f"{forced_type.value}:{description}" if forced_type else description
        cached = get_cached(cache_key, category_tree)
        if cached is not None:
            return cached

        if not category_tree:
            return _FALLBACK if not forced_type else {**_FALLBACK, "transaction_type": forced_type.value}

        # When type is forced, filter tree to matching categories (fall back to full tree if empty)
        active_tree = category_tree
        if forced_type:
            filtered = {
                cat: subcats
                for cat, subcats in category_tree.items()
                if (category_type_map or {}).get(cat, "expense") == forced_type.value
            }
            if filtered:
                active_tree = filtered

        try:
            if self._should_use_two_pass(active_tree):
                result = self._classify_two_pass(description, active_tree, category_type_map, forced_type)
            else:
                result = self._classify_single_pass(description, active_tree, category_type_map, forced_type)
        except Exception as e:
            logger.warning("LLM classification failed for %r: %s", description, e)
            result = _FALLBACK if not forced_type else {**_FALLBACK, "transaction_type": forced_type.value}

        set_cached(cache_key, result)
        return result

    def _should_use_two_pass(self, category_tree: dict[str, list[str]]) -> bool:
        total_subcats = sum(len(v) for v in category_tree.values())
        return (
            len(category_tree) > SINGLE_PASS_MAX_CATEGORIES
            or total_subcats > SINGLE_PASS_MAX_SUBCATEGORIES
        )

    def _classify_single_pass(
        self,
        description: str,
        category_tree: dict[str, list[str]],
        category_type_map: dict[str, str] | None = None,
        forced_type: TransactionType | None = None,
    ) -> dict:
        categories_list = list(category_tree.keys())
        if forced_type:
            user_prompt = (
                f'Transaction description: "{description}"\n'
                f"Transaction type: {forced_type.value}\n\n"
                f"Available categories and subcategories:\n"
                f"{self._build_category_block(category_tree, category_type_map)}\n\n"
                f"Return the JSON object now."
            )
            raw = self._call_llm(_SYSTEM_PROMPT_TYPED, user_prompt)
        else:
            user_prompt = (
                f'Transaction description: "{description}"\n\n'
                f"Available categories and subcategories:\n"
                f"{self._build_category_block(category_tree, category_type_map)}\n\n"
                f"Return the JSON object now."
            )
            raw = self._call_llm(_SYSTEM_PROMPT, user_prompt)
        return self._validate_and_resolve(raw, category_tree, categories_list, category_type_map, forced_type)

    def _classify_two_pass(
        self,
        description: str,
        category_tree: dict[str, list[str]],
        category_type_map: dict[str, str] | None = None,
        forced_type: TransactionType | None = None,
    ) -> dict:
        categories_list = list(category_tree.keys())
        fallback = _FALLBACK if not forced_type else {**_FALLBACK, "transaction_type": forced_type.value}

        # Pass 1 — pick category (and transaction_type if not forced)
        cat_block = "\n".join(
            f"[{i}] {name} [{(category_type_map or {}).get(name, 'expense')}]"
            for i, name in enumerate(categories_list)
        )
        if forced_type:
            pass1_prompt = (
                f'Transaction description: "{description}"\n'
                f"Transaction type: {forced_type.value}\n\n"
                f"Available categories:\n{cat_block}\n\n"
                f"Return the JSON object now."
            )
            raw1 = self._call_llm(_SYSTEM_PROMPT_PASS1_TYPED, pass1_prompt)
        else:
            pass1_prompt = (
                f'Transaction description: "{description}"\n\n'
                f"Available categories:\n{cat_block}\n\n"
                f"Return the JSON object now."
            )
            raw1 = self._call_llm(_SYSTEM_PROMPT_PASS1, pass1_prompt)

        cat_idx = raw1.get("category_index")
        if not isinstance(cat_idx, int) or cat_idx < 0 or cat_idx >= len(categories_list):
            return fallback
        resolved_category = categories_list[cat_idx]
        confidence1 = max(0.0, min(1.0, float(raw1.get("confidence", 0.0))))
        transaction_type = forced_type.value if forced_type else _extract_type(raw1, resolved_category, category_type_map)

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
            return {"transaction_type": transaction_type, "category": resolved_category, "subcategory": None, "confidence": confidence1 * 0.5}

        sub_idx = raw2.get("subcategory_index")
        confidence2 = max(0.0, min(1.0, float(raw2.get("confidence", 0.0))))

        if not isinstance(sub_idx, int):
            return {"transaction_type": transaction_type, "category": resolved_category, "subcategory": None, "confidence": confidence1 * 0.5}
        if sub_idx == -1:
            return {"transaction_type": transaction_type, "category": resolved_category, "subcategory": None, "confidence": confidence1 * confidence2}
        if sub_idx < 0 or sub_idx >= len(subcats):
            return {"transaction_type": transaction_type, "category": resolved_category, "subcategory": None, "confidence": confidence1 * 0.5}

        return {
            "transaction_type": transaction_type,
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
        category_type_map: dict[str, str] | None = None,
        forced_type: TransactionType | None = None,
    ) -> dict:
        fallback = _FALLBACK if not forced_type else {**_FALLBACK, "transaction_type": forced_type.value}
        confidence = max(0.0, min(1.0, float(raw_response.get("confidence", 0.0))))

        cat_idx = raw_response.get("category_index")
        if not isinstance(cat_idx, int) or cat_idx < 0 or cat_idx >= len(categories_list):
            return fallback

        resolved_category = categories_list[cat_idx]
        subcats = category_tree[resolved_category]
        transaction_type = forced_type.value if forced_type else _extract_type(raw_response, resolved_category, category_type_map)

        sub_idx = raw_response.get("subcategory_index")
        if not isinstance(sub_idx, int):
            return {"transaction_type": transaction_type, "category": resolved_category, "subcategory": None, "confidence": confidence * 0.5}
        if sub_idx == -1:
            return {"transaction_type": transaction_type, "category": resolved_category, "subcategory": None, "confidence": confidence}
        if sub_idx < 0 or sub_idx >= len(subcats):
            return {"transaction_type": transaction_type, "category": resolved_category, "subcategory": None, "confidence": confidence * 0.5}

        return {
            "transaction_type": transaction_type,
            "category": resolved_category,
            "subcategory": subcats[sub_idx],
            "confidence": confidence,
        }

    def _build_category_block(
        self,
        category_tree: dict[str, list[str]],
        category_type_map: dict[str, str] | None = None,
    ) -> str:
        lines = []
        for cat_idx, (cat_name, subcats) in enumerate(category_tree.items()):
            cat_type = (category_type_map or {}).get(cat_name, "expense")
            lines.append(f"[{cat_idx}] {cat_name} [{cat_type}]")
            for sub_idx, sub_name in enumerate(subcats):
                lines.append(f"    [{sub_idx}] {sub_name}")
        return "\n".join(lines)


_SYSTEM_PROMPT_TYPED = """You are a financial transaction categorizer.
The transaction type has already been determined. Your only job is to pick the best category and subcategory.

Category rules:
- You MUST select a category_index from the numbered list.
- Select the best matching subcategory_index. If none fit, use -1.
- Do NOT invent new categories or subcategories.
- Return ONLY a JSON object. No explanation, no markdown, no extra keys.

Response format:
{"category_index": <int>, "subcategory_index": <int or -1>, "confidence": <float 0.0-1.0>}"""


def _extract_type(
    raw: dict,
    resolved_category: str,
    category_type_map: dict[str, str] | None,
) -> str:
    """Read transaction_type from the LLM response; fall back to the DB map."""
    llm_type = raw.get("transaction_type")
    if isinstance(llm_type, str) and llm_type in _VALID_TYPES:
        return llm_type
    return _resolve_transaction_type(resolved_category, category_type_map) or "expense"
