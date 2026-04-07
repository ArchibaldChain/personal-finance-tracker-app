from pydantic import BaseModel, ConfigDict


class SubcategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    icon: str | None


class SubcategoryCreate(BaseModel):
    name: str
    icon: str | None = None


class SubcategoryUpdate(BaseModel):
    name: str | None = None
    icon: str | None = None


class CategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    icon: str | None
    ledger_id: int | None = None
    subcategories: list[SubcategoryRead]


class CategoryCreate(BaseModel):
    name: str
    icon: str | None = None


class CategoryUpdate(BaseModel):
    name: str | None = None
    icon: str | None = None


class CategoryListResponse(BaseModel):
    categories: list[CategoryRead]
