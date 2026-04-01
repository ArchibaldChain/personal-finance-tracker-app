# Importing parsers here registers them as a side-effect.
# This module must be imported at app startup (it is, via app/main.py).
# To add a new institution: create a parser module and add a register() call here.

from app.parsers.bmo_parser import BMOParser
from app.parsers.bofa_parser import BofAParser
from app.parsers.chase_parser import ChaseParser
from app.parsers.registry import registry
from app.parsers.walmart_rewards_parser import WalmartRewardsParser

registry.register("chase", ChaseParser)
registry.register("bofa", BofAParser)
registry.register("walmart_rewards", WalmartRewardsParser)
registry.register("bmo", BMOParser)

__all__ = ["registry"]
