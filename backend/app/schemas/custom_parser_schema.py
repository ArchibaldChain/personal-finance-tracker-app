from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, model_validator


class CustomParserConfigCreate(BaseModel):
    name: str
    skip_rows: int = 0
    # UI direction: CSV column name → ParsedRow field (or "ignore")
    # Description may use a pipe-joined key ("Col1|Col2") to concatenate multiple columns.
    column_mapping: dict[str, str]
    date_format: str = "%m/%d/%Y"
    currency: str = "USD"
    account_type: Literal["debit", "credit", "investment"] = "debit"
    csv_headers: list[str]
    ledger_id: int | None = None
    created_by_user_id: int | None = None

    @model_validator(mode="after")
    def validate_required_fields(self) -> "CustomParserConfigCreate":
        values = set(self.column_mapping.values())
        missing = {"transaction_date", "amount"} - values
        if missing:
            raise ValueError(f"column_mapping is missing required fields: {missing}")
        return self


class CustomParserConfigUpdate(BaseModel):
    name: str | None = None
    skip_rows: int | None = None
    column_mapping: dict[str, str] | None = None
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
    date_format: str
    currency: str
    account_type: str
    column_signature: str | None
    ledger_id: int | None
    created_by_user_id: int | None
    created_at: datetime
    updated_at: datetime


class PreviewRequest(BaseModel):
    skip_rows: int = 0
    column_mapping: dict[str, str]
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
    preview_rows: list[dict[str, str]]
