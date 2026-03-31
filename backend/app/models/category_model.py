from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Subcategory(Base):
    __tablename__ = "subcategories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    category_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("categories.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)

    category: Mapped["Category"] = relationship("Category", back_populates="subcategories")

    __table_args__ = (UniqueConstraint("category_id", "name", name="uq_subcategory_name"),)


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)

    subcategories: Mapped[list[Subcategory]] = relationship(
        "Subcategory", back_populates="category", cascade="all, delete-orphan"
    )
