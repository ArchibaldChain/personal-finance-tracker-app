from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    import_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("imports.id"), nullable=True
    )
    source_type: Mapped[str] = mapped_column(String(50), nullable=False)  # "csv" | "manual"
    source_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    transaction_date: Mapped[date] = mapped_column(Date, nullable=False)
    posted_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="USD", nullable=False)

    merchant_raw: Mapped[str | None] = mapped_column(String(255), nullable=True)
    merchant_normalized: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    subcategory: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    import_: Mapped["Import | None"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Import", back_populates="transactions"
    )

    __table_args__ = (
        Index("ix_transactions_transaction_date", "transaction_date"),
        Index("ix_transactions_category", "category"),
        Index("ix_transactions_source_type", "source_type"),
        Index("ix_transactions_is_deleted", "is_deleted"),
        Index("ix_transactions_external_id", "external_id"),
    )
