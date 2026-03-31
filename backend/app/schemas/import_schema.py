from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ImportRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    source_name: str
    file_name: str
    uploaded_at: datetime
    status: str
    total_rows: int | None
    parsed_rows: int
    failed_rows: int


class ImportListResponse(BaseModel):
    items: list[ImportRead]
    total: int
