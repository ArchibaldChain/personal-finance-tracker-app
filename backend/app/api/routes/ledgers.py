from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.category_model import Category, Subcategory
from app.models.import_model import Import
from app.models.import_row_model import ImportRow
from app.models.transaction_model import Transaction
from app.models.user_model import Ledger, LedgerMember, User
from app.schemas.ledger_schema import LedgerRead, UserCreate, UserRead, UserUpdate
from app.services.ledger_service import create_default_ledger_for_user

router = APIRouter(prefix="/ledgers", tags=["ledgers"])


@router.get("/default", response_model=LedgerRead)
def get_default_ledger(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LedgerRead:
    ledger = (
        db.query(Ledger)
        .options(joinedload(Ledger.owner))
        .filter(
            Ledger.owner_user_id == current_user.id,
            Ledger.is_default == True,  # noqa: E712
            Ledger.is_archived == False,  # noqa: E712
        )
        .first()
    )
    if not ledger:
        raise HTTPException(status_code=404, detail="No default ledger found")
    return LedgerRead.model_validate(ledger)


@router.get("/users", response_model=list[UserRead])
def list_users(db: Session = Depends(get_db)) -> list[UserRead]:
    """List all users. Used by the dev user switcher (no auth required)."""
    users = db.query(User).filter(User.is_active == True).order_by(User.id).all()  # noqa: E712
    return [UserRead.model_validate(u) for u in users]


@router.post("/users", response_model=UserRead, status_code=201)
def create_user(data: UserCreate, db: Session = Depends(get_db)) -> UserRead:
    """Create a new local user. Used by dev mode (no auth required)."""
    auth_provider_user_id = data.auth_provider_user_id or f"local-{data.email}"

    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=409, detail="A user with this email already exists")

    user = User(
        auth_provider=data.auth_provider,
        auth_provider_user_id=auth_provider_user_id,
        email=data.email,
        display_name=data.display_name,
        avatar_url=data.avatar_url,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    create_default_ledger_for_user(db, user)

    return UserRead.model_validate(user)


@router.patch("/users/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserRead:
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if data.email is not None and data.email != user.email:
        if db.query(User).filter(User.email == data.email).first():
            raise HTTPException(status_code=409, detail="Email already in use")
        user.email = data.email
    if data.display_name is not None:
        user.display_name = data.display_name
    if "avatar_url" in data.model_fields_set:
        user.avatar_url = data.avatar_url
    db.commit()
    db.refresh(user)
    return UserRead.model_validate(user)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    ledger_ids = [
        row[0] for row in db.query(Ledger.id).filter(Ledger.owner_user_id == user_id).all()
    ]

    for ledger_id in ledger_ids:
        import_ids = [
            row[0] for row in db.query(Import.id).filter(Import.ledger_id == ledger_id).all()
        ]
        for import_id in import_ids:
            db.query(ImportRow).filter(ImportRow.import_id == import_id).delete()
        db.query(Transaction).filter(Transaction.ledger_id == ledger_id).delete()
        db.query(Import).filter(Import.ledger_id == ledger_id).delete()

        cat_ids = [
            row[0] for row in db.query(Category.id).filter(Category.ledger_id == ledger_id).all()
        ]
        for cat_id in cat_ids:
            db.query(Subcategory).filter(Subcategory.category_id == cat_id).delete()
        db.query(Category).filter(Category.ledger_id == ledger_id).delete()

    db.query(LedgerMember).filter(LedgerMember.user_id == user_id).delete()
    db.query(LedgerMember).filter(LedgerMember.ledger_id.in_(ledger_ids)).delete()
    db.query(Ledger).filter(Ledger.owner_user_id == user_id).delete()

    db.delete(user)
    db.commit()