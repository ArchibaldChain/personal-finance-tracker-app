from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class TransactionCreate(BaseModel):
    transaction_date: date
    amount: Decimal = Field(..., description="Negative for expenses, positive for income/credits")
    currency: str = "USD"
    merchant_normalized: str | None = None
    description: str | None = None
    transaction_type: str | None = None
    category: str | None = None
    subcategory: str | None = None
    notes: str | None = None
    source_type: Literal["csv", "manual"] = "manual"
    source_name: str | None = None
    import_id: int | None = None
    merchant_raw: str | None = None
    external_id: str | None = None
    posted_date: date | None = None


class TransactionUpdate(BaseModel):
    """All fields optional — only provided fields are updated (PATCH semantics)."""

    transaction_date: date | None = None
    amount: Decimal | None = None
    currency: str | None = None
    merchant_normalized: str | None = None
    description: str | None = None
    transaction_type: str | None = None
    category: str | None = None
    subcategory: str | None = None
    notes: str | None = None
    posted_date: date | None = None


class TransactionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    import_id: int | None
    source_type: str
    source_name: str | None
    external_id: str | None
    transaction_date: date
    posted_date: date | None
    amount: Decimal
    currency: str
    merchant_raw: str | None
    merchant_normalized: str | None
    description: str | None
    transaction_type: str | None
    category: str | None
    subcategory: str | None
    classification_confidence: float | None
    notes: str | None
    ledger_id: int | None = None
    created_by_user_id: int | None = None
    updated_by_user_id: int | None = None
    is_deleted: bool
    created_at: datetime
    updated_at: datetime


class TransactionListResponse(BaseModel):
    items: list[TransactionRead]
    total: int
    page: int
    page_size: int
