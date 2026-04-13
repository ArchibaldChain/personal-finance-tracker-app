from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Index, Integer, Numeric, String, Text, func
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    import_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("imports.id"), nullable=True
    )
    ledger_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("ledgers.id"), nullable=True
    )
    created_by_user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )
    updated_by_user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
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

    transaction_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    category_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("categories.id"), nullable=True)
    subcategory_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("subcategories.id"), nullable=True)
    classification_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
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
    ledger: Mapped["Ledger | None"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Ledger", foreign_keys=[ledger_id]
    )
    created_by: Mapped["User | None"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "User", foreign_keys=[created_by_user_id]
    )
    updated_by: Mapped["User | None"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "User", foreign_keys=[updated_by_user_id]
    )
    category_obj: Mapped["Category | None"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Category", foreign_keys=[category_id], lazy="joined"
    )
    subcategory_obj: Mapped["Subcategory | None"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Subcategory", foreign_keys=[subcategory_id], lazy="joined"
    )

    @hybrid_property
    def category(self) -> str | None:
        return self.category_obj.name if self.category_obj else None

    @hybrid_property
    def subcategory(self) -> str | None:
        return self.subcategory_obj.name if self.subcategory_obj else None

    __table_args__ = (
        Index("ix_transactions_transaction_date", "transaction_date"),
        Index("ix_transactions_category_id", "category_id"),
        Index("ix_transactions_source_type", "source_type"),
        Index("ix_transactions_is_deleted", "is_deleted"),
        Index("ix_transactions_external_id", "external_id"),
    )
