from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, model_validator


class CustomParserConfigCreate(BaseModel):
    name: str
    skip_rows: int = 0
    # UI direction: CSV column name → ParsedRow field (or "ignore")
    # e.g. {"Date": "transaction_date", "Amount": "amount", "Memo": "description"}
    # The service inverts this to field → column before storing.
    column_mapping: dict[str, str]
    amount_mode: Literal["single", "split"] = "single"
    debit_column: str | None = None
    credit_column: str | None = None
    date_format: str = "%m/%d/%Y"
    currency: str = "USD"
    account_type: Literal["debit", "credit", "investment"] = "debit"
    # Raw CSV headers sent by the frontend — used to compute the column signature
    csv_headers: list[str]
    ledger_id: int | None = None
    created_by_user_id: int | None = None

    @model_validator(mode="after")
    def validate_amount_columns(self) -> "CustomParserConfigCreate":
        if self.amount_mode == "split":
            if not self.debit_column and not self.credit_column:
                raise ValueError("split mode requires at least one of debit_column or credit_column")
        else:
            if "amount" not in self.column_mapping.values():
                raise ValueError("single mode requires 'amount' in column_mapping")
        return self

    @model_validator(mode="after")
    def validate_required_fields(self) -> "CustomParserConfigCreate":
        required = {"transaction_date", "description"}
        missing = required - set(self.column_mapping.values())
        if missing:
            raise ValueError(f"column_mapping is missing required fields: {missing}")
        return self


class CustomParserConfigUpdate(BaseModel):
    name: str | None = None
    skip_rows: int | None = None
    column_mapping: dict[str, str] | None = None
    amount_mode: Literal["single", "split"] | None = None
    debit_column: str | None = None
    credit_column: str | None = None
    date_format: str | None = None
    currency: str | None = None
    account_type: Literal["debit", "credit", "investment"] | None = None
    csv_headers: list[str] | None = None


class CustomParserConfigRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    skip_rows: int
    column_mapping_json: str
    amount_mode: str
    debit_column: str | None
    credit_column: str | None
    date_format: str
    currency: str
    account_type: str
    column_signature: str | None
    ledger_id: int | None
    created_by_user_id: int | None
    created_at: datetime
    updated_at: datetime


class PreviewRequest(BaseModel):
    """Config payload for the stateless preview endpoint (no name/id needed)."""
    skip_rows: int = 0
    # key = CSV column name, value = ParsedRow field name or "ignore"
    column_mapping: dict[str, str]
    amount_mode: Literal["single", "split"] = "single"
    debit_column: str | None = None
    credit_column: str | None = None
    date_format: str = "%m/%d/%Y"
    currency: str = "USD"
    account_type: Literal["debit", "credit", "investment"] = "debit"


class PreviewRow(BaseModel):
    row_index: int
    raw: dict[str, str]
    parsed: dict | None
    error: str | None


class PreviewResponse(BaseModel):
    rows: list[PreviewRow]
    total_rows: int


class DetectResponse(BaseModel):
    match: CustomParserConfigRead | None
    headers: list[str]
