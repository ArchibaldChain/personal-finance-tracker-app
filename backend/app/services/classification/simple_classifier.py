import logging

from app.services.classification.base import BaseClassifier
from app.services.classification.utils import resolve_transaction_type as _resolve_transaction_type
from app.utils import get_logger

logger = get_logger(__name__, level=logging.WARNING)


class SimpleClassifier(BaseClassifier):
    """Rule-based classifier using keyword matching on transaction descriptions.

    Rules are checked in order — first match wins. Add your own rules below
    by appending to the RULES list. Each rule is a tuple of:
        (keywords, category, subcategory)

    keywords    : list of lowercase strings; matches if ANY appear in the description
    category    : must match a key in the category_tree passed to classify()
    subcategory : must match a value under that category in the category_tree
    """

    # ------------------------------------------------------------------
    # Hard-coded rules — edit here to add your own
    # Format: (keywords, category, subcategory)
    # ------------------------------------------------------------------
    RULES: list[tuple[list[str], str, str]] = [
        # --- Income ---
        (["pay/pay", "bba engineering"], "Income", "Salary"),

        # --- E-Transfer ---
        (["interac etrnsfr", "interac e-transfer"], "Transfers", "E-Transfer"),

        # --- Internal Transfer ---
        (["[cw] tf"], "Transfers", "Internal Transfer"),

        # --- Investments ---
        (["ws investments", "interactive bro", "interactive brk"], "Transfers", "Investment Transfer"),

        # --- Fees ---
        (["interac e-transfer fee", "performance plan", "fee rebate"], "Fees", "Bank Fee"),

        # --- Tax ---
        (["gst/tps", "fhb/alf"], "Income", "Other Income"),

        # --- Interest ---
        (["bonus interest", "[in]"], "Income", "Interest"),

        # --- Credit Card Payment ---
        (["walmart m/c", "bmo payment", "pymt received", "payment - thank you"], 
         "Transfers", "Credit Card Payment"),

        # --- Cash Withdrawal ---
        (["atm withdrawal", "[ib]"], "Transfers", "Cash Withdrawal"),

        # --- Tuition ---
        (["york uni", "tuition"], "Education", "Tuition"),

        # ----------------------------------------------------------------
        # ADD YOUR RULES ABOVE THIS LINE
        # ----------------------------------------------------------------
    ]

    def classify(
        self,
        description: str,
        category_tree: dict[str, list[str]],
        category_type_map: dict[str, str] | None = None,
    ) -> dict:
        desc = description.lower()
        logger.debug("classifying: %r", description)

        for keywords, category, subcategory in self.RULES:
            matched_kw = next((kw for kw in keywords if kw in desc), None)
            if matched_kw:
                if category in category_tree and subcategory in category_tree[category]:
                    logger.debug(
                        "rule match: keyword=%r -> %s / %s",
                        matched_kw, category, subcategory,
                    )
                    transaction_type = _resolve_transaction_type(category, category_type_map)
                    return {
                        "transaction_type": transaction_type,
                        "category": category,
                        "subcategory": subcategory,
                        "confidence": 1.0,
                    }
                logger.warning(
                    "rule matched keyword=%r -> %s / %s but not found in category_tree",
                    matched_kw, category, subcategory,
                )

        logger.warning("no rule matched for: %r", description)
        return {"transaction_type": None, "category": None, "subcategory": None, "confidence": 0.0}
