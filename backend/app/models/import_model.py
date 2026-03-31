from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Import(Base):
    __tablename__ = "imports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_name: Mapped[str] = mapped_column(String(100), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)
    total_rows: Mapped[int | None] = mapped_column(Integer, nullable=True)
    parsed_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failed_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    rows: Mapped[list["ImportRow"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "ImportRow", back_populates="import_", cascade="all, delete-orphan"
    )
    transactions: Mapped[list["Transaction"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Transaction", back_populates="import_"
    )
