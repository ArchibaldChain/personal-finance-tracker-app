from pydantic import BaseModel, ConfigDict


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    display_name: str
    email: str
    avatar_url: str | None = None


class UserCreate(BaseModel):
    display_name: str
    email: str
    avatar_url: str | None = None
    auth_provider: str = "local"
    auth_provider_user_id: str | None = None  # auto-generated from email if omitted


class UserUpdate(BaseModel):
    display_name: str | None = None
    email: str | None = None
    avatar_url: str | None = None


class LedgerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    base_currency: str
    is_default: bool
    owner: UserRead
