"""
Optional seed script — inserts sample transactions for demo/development purposes.

Usage (from the backend/ directory):
    uv run python sample_data/seed_transactions.py
"""

import sys
from datetime import date, timedelta
from pathlib import Path

# Ensure the app package is importable
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.base import Base  # noqa: E402
from app.db.session import SessionLocal, engine  # noqa: E402
from app.models.transaction_model import Transaction  # noqa: E402
import app.models  # noqa: E402, F401

Base.metadata.create_all(bind=engine)

SAMPLES = [
    ("Starbucks", "Coffee run", "Food", "Coffee / Tea", -5.75),
    ("Whole Foods Market", "Weekly groceries", "Groceries", "Supermarket", -92.40),
    ("Netflix", "Monthly subscription", "Entertainment", "Streaming Services", -15.99),
    ("Amazon", "Office supplies", "Shopping", "Daily Supplies", -34.99),
    ("Uber", "Ride to airport", "Transportation", "Taxi / Uber", -28.50),
    ("Shell Gas Station", "Fill up", "Car", "Fuel", -55.20),
    ("CVS Pharmacy", "Cold medicine", "Health", "Pharmacy", -18.75),
    ("Planet Fitness", "Monthly membership", "Sports", "Gym", -24.99),
    ("Chipotle", "Lunch", "Food", "Restaurant", -13.25),
    ("Spotify", "Music subscription", "Entertainment", "Streaming Services", -9.99),
    ("Target", "Household items", "Shopping", "Daily Supplies", -67.80),
    ("Trader Joe's", "Groceries", "Groceries", "Supermarket", -55.60),
    ("Comcast", "Internet bill", "Utilities", "Internet", -79.99),
    ("AT&T", "Mobile plan", "Phone & Internet", "Mobile Plan", -45.00),
    ("Panera Bread", "Breakfast", "Food", "Restaurant", -11.50),
    ("IKEA", "Desk lamp", "Housing", "Furniture", -29.99),
    ("Walgreens", "Vitamins", "Health", "Supplements", -22.40),
    ("Paycheck", "Direct deposit", None, None, 3200.00),
    ("Uber Eats", "Dinner delivery", "Food", "Takeout / Delivery", -38.75),
    ("Apple App Store", "App purchase", "Entertainment", "Software / Tools", -4.99),
]


def main() -> None:
    db = SessionLocal()
    try:
        existing = db.query(Transaction).count()
        if existing > 0:
            print(f"DB already has {existing} transactions. Skipping seed.")
            return

        base_date = date.today() - timedelta(days=30)
        for i, (merchant, desc, category, subcategory, amount) in enumerate(SAMPLES):
            tx = Transaction(
                source_type="manual",
                source_name="seed",
                transaction_date=base_date + timedelta(days=i),
                amount=amount,
                currency="USD",
                merchant_normalized=merchant,
                description=desc,
                category=category,
                subcategory=subcategory,
                is_deleted=False,
            )
            db.add(tx)

        db.commit()
        print(f"Seeded {len(SAMPLES)} transactions.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
