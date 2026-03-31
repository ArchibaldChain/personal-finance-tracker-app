from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.transaction_schema import (
    TransactionCreate,
    TransactionListResponse,
    TransactionRead,
    TransactionUpdate,
)
from app.services import transaction_service

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("", response_model=TransactionListResponse)
def list_transactions(
    search: str | None = Query(None),
    category: str | None = Query(None),
    source_type: str | None = Query(None),
    sort_by: str = Query("transaction_date"),
    sort_dir: str = Query("desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> TransactionListResponse:
    items, total = transaction_service.list_transactions(
        db,
        search=search,
        category=category,
        source_type=source_type,
        sort_by=sort_by,
        sort_dir=sort_dir,
        page=page,
        page_size=page_size,
    )
    return TransactionListResponse(
        items=[TransactionRead.model_validate(t) for t in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{tx_id}", response_model=TransactionRead)
def get_transaction(tx_id: int, db: Session = Depends(get_db)) -> TransactionRead:
    transaction = transaction_service.get_transaction(db, tx_id)
    if not transaction:
        raise HTTPException(status_code=404, detail=f"Transaction {tx_id} not found")
    return TransactionRead.model_validate(transaction)


@router.post("", response_model=TransactionRead, status_code=status.HTTP_201_CREATED)
def create_transaction(
    data: TransactionCreate, db: Session = Depends(get_db)
) -> TransactionRead:
    transaction = transaction_service.create_transaction(db, data)
    return TransactionRead.model_validate(transaction)


@router.patch("/{tx_id}", response_model=TransactionRead)
def update_transaction(
    tx_id: int, data: TransactionUpdate, db: Session = Depends(get_db)
) -> TransactionRead:
    transaction = transaction_service.update_transaction(db, tx_id, data)
    if not transaction:
        raise HTTPException(status_code=404, detail=f"Transaction {tx_id} not found")
    return TransactionRead.model_validate(transaction)


@router.delete("/{tx_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(tx_id: int, db: Session = Depends(get_db)) -> None:
    deleted = transaction_service.delete_transaction(db, tx_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Transaction {tx_id} not found")
