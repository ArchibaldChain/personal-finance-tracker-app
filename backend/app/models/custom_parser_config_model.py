from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CustomParserConfig(Base):
    __tablename__ = "custom_parser_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    ledger_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("ledgers.id"), nullable=True)
    created_by_user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    skip_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    column_mapping_json: Mapped[str] = mapped_column(Text, nullable=False)
    amount_mode: Mapped[str] = mapped_column(String(20), default="single", nullable=False)
    debit_column: Mapped[str | None] = mapped_column(String(255), nullable=True)
    credit_column: Mapped[str | None] = mapped_column(String(255), nullable=True)
    date_format: Mapped[str] = mapped_column(String(50), default="%m/%d/%Y", nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="USD", nullable=False)
    account_type: Mapped[str] = mapped_column(String(20), default="debit", nullable=False)
    column_signature: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
