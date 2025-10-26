from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env", "../../.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    app_name: str = Field(default="Oilseed Hedging Backend")
    environment: Literal["development", "production", "test"] = Field(
        default="development"
    )
    database_url: str = Field(
        alias="DATABASE_URL",
    )
    secret_key: str = Field(
        default="super-secret-development-key",
        alias="JWT_SECRET_KEY",
    )
    algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(
        default=60 * 24, alias="ACCESS_TOKEN_EXPIRE_MINUTES"
    )
    cors_origins: str = Field(default="http://localhost:3000,http://127.0.0.1:3000")
    media_root: str = Field(default="./storage")
    price_feed_secret: str = Field(default="secret-token", alias="PRICE_FEED_SECRET")

    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
