from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./finance.db"
    CORS_ORIGINS: List[str] = ["http://localhost:5173"]
    OPENAI_API_KEY: str = ""
    CLASSIFICATION_ENABLED: bool = True
    CLASSIFICATION_MODEL: str = "gpt-4o-mini"
    GOOGLE_CLIENT_ID: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
