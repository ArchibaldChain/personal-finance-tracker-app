from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    auth_provider: Mapped[str] = mapped_column(String(50), default="local", nullable=False)
    auth_provider_user_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    owned_ledgers: Mapped[list["Ledger"]] = relationship(
        "Ledger", back_populates="owner", foreign_keys="Ledger.owner_user_id"
    )
    ledger_memberships: Mapped[list["LedgerMember"]] = relationship(
        "LedgerMember", back_populates="user"
    )


class Ledger(Base):
    __tablename__ = "ledgers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    owner_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    base_currency: Mapped[str] = mapped_column(String(10), default="CAD", nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    owner: Mapped["User"] = relationship(
        "User", back_populates="owned_ledgers", foreign_keys=[owner_user_id]
    )
    members: Mapped[list["LedgerMember"]] = relationship(
        "LedgerMember", back_populates="ledger"
    )


class LedgerMember(Base):
    __tablename__ = "ledger_members"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ledger_id: Mapped[int] = mapped_column(Integer, ForeignKey("ledgers.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)  # "owner" | "member"
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    ledger: Mapped["Ledger"] = relationship("Ledger", back_populates="members")
    user: Mapped["User"] = relationship("User", back_populates="ledger_memberships")
