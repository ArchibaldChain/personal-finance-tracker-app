from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.security import check_ledger_access, get_current_user
from app.db.session import get_db
from app.models.transaction_model import Transaction
from app.models.user_model import Ledger, User
from app.schemas.transaction_schema import (
    TransactionCreate,
    TransactionListResponse,
    TransactionRead,
    TransactionUpdate,
)
from app.services import transaction_service

router = APIRouter(prefix="/transactions", tags=["transactions"])


def _check_tx_access(tx_id: int, user_id: int, db: Session) -> Transaction:
    tx = db.get(Transaction, tx_id)
    if not tx:
        raise HTTPException(status_code=404, detail=f"Transaction {tx_id} not found")
    check_ledger_access(tx.ledger_id, user_id, db)
    return tx


@router.get("", response_model=TransactionListResponse)
def list_transactions(
    search: str | None = Query(None),
    category: str | None = Query(None),
    source_type: str | None = Query(None),
    needs_review: bool = Query(False),
    is_duplicate: bool = Query(False),
    sort_by: str = Query("transaction_date"),
    sort_dir: str = Query("desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    ledger_id: int | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TransactionListResponse:
    if ledger_id is not None:
        check_ledger_access(ledger_id, current_user.id, db)
    items, total = transaction_service.list_transactions(
        db,
        search=search,
        category=category,
        source_type=source_type,
        needs_review=needs_review,
        is_duplicate=is_duplicate,
        sort_by=sort_by,
        sort_dir=sort_dir,
        page=page,
        page_size=page_size,
        date_from=date_from,
        date_to=date_to,
        ledger_id=ledger_id,
    )
    return TransactionListResponse(
        items=[TransactionRead.model_validate(t) for t in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/summary")
def get_summary(
    search: str | None = Query(None),
    category: str | None = Query(None),
    source_type: str | None = Query(None),
    needs_review: bool = Query(False),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    ledger_id: int | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    if ledger_id is not None:
        check_ledger_access(ledger_id, current_user.id, db)
    return transaction_service.get_transaction_summary(
        db,
        search=search,
        category=category,
        source_type=source_type,
        needs_review=needs_review,
        date_from=date_from,
        date_to=date_to,
        ledger_id=ledger_id,
    )


@router.get("/{tx_id}", response_model=TransactionRead)
def get_transaction(
    tx_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TransactionRead:
    tx = _check_tx_access(tx_id, current_user.id, db)
    return TransactionRead.model_validate(tx)


@router.post("", response_model=TransactionRead, status_code=status.HTTP_201_CREATED)
def create_transaction(
    data: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TransactionRead:
    if data.ledger_id is not None:
        check_ledger_access(data.ledger_id, current_user.id, db)
    transaction = transaction_service.create_transaction(db, data)
    return TransactionRead.model_validate(transaction)


@router.patch("/{tx_id}", response_model=TransactionRead)
def update_transaction(
    tx_id: int,
    data: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TransactionRead:
    _check_tx_access(tx_id, current_user.id, db)
    transaction = transaction_service.update_transaction(db, tx_id, data)
    if not transaction:
        raise HTTPException(status_code=404, detail=f"Transaction {tx_id} not found")
    return TransactionRead.model_validate(transaction)


@router.delete("/{tx_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    tx_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    _check_tx_access(tx_id, current_user.id, db)
    deleted = transaction_service.delete_transaction(db, tx_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Transaction {tx_id} not found")