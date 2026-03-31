from pydantic import BaseModel, ConfigDict


class SubcategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class CategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    subcategories: list[SubcategoryRead]


class CategoryListResponse(BaseModel):
    categories: list[CategoryRead]
