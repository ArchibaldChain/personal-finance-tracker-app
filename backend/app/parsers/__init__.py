# Importing parsers here registers them as a side-effect.
# This module must be imported at app startup (it is, via app/main.py).
# To add a new institution: create a parser module and add a register() call here.

from app.parsers.bmo_parser import BMOCreditParser, BMODebitParser
from app.parsers.bofa_parser import BofAParser
from app.parsers.chase_parser import ChaseParser
from app.parsers.registry import registry
from app.parsers.walmart_rewards_parser import WalmartRewardsParser
from app.parsers.wealthsimple_parser import WealthsimpleParser

registry.register("chase", ChaseParser, display_name="Chase")
registry.register("bofa", BofAParser, display_name="Bank of America")
registry.register("walmart_rewards", WalmartRewardsParser, display_name="Walmart Rewards")
registry.register("bmo_credit_card", BMOCreditParser, display_name="BMO Credit")
registry.register("bmo_debit", BMODebitParser, display_name="BMO Debit")
registry.register("wealthsimple", WealthsimpleParser, display_name="Wealthsimple")

__all__ = ["registry"]
