from sqlalchemy.orm import Session

from app.models.user_model import Ledger, LedgerMember, User


def create_default_ledger_for_user(db: Session, user: User) -> Ledger:
    """Create a default ledger and owner membership for a new user.

    Not wired to any route yet. Call this after creating a User record
    once authentication is in place. Also seeds default categories for
    the new ledger automatically.
    """
    from app.services.category_service import seed_categories

    ledger = Ledger(
        name="Default Ledger",
        owner_user_id=user.id,
        base_currency="CAD",
        is_default=True,
        is_archived=False,
    )
    db.add(ledger)
    db.flush()  # get ledger.id without committing

    membership = LedgerMember(
        ledger_id=ledger.id,
        user_id=user.id,
        role="owner",
        is_active=True,
    )
    db.add(membership)
    db.commit()
    db.refresh(ledger)

    seed_categories(db, ledger_id=ledger.id)

    return ledger
