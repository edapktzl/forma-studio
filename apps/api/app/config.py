from functools import lru_cache
from urllib.parse import urlsplit

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Forma Studio API"
    environment: str = "development"
    database_url: str = "postgresql+psycopg://forma:forma@localhost:5432/forma"
    cors_origins: str = "http://localhost:3000,http://localhost:3001"
    jwt_secret: str = "change-this-development-secret"
    access_token_minutes: int = Field(default=15, ge=1, le=60)
    refresh_token_days: int = Field(default=7, ge=1, le=30)
    login_rate_limit: int = Field(default=10, ge=1)
    contact_rate_limit: int = Field(default=5, ge=1)
    rate_limit_window_seconds: int = Field(default=600, ge=1)
    admin_notification_email: str = "studio@example.com"
    resend_api_key: str = ""
    mail_from: str = "Forma Studio <notifications@example.com>"
    media_storage_path: str = "storage/media"

    model_config = SettingsConfigDict(env_file=".env", env_prefix="", extra="ignore")

    @model_validator(mode="after")
    def validate_production_security(self):
        if self.environment == "production":
            if len(self.jwt_secret) < 32 or self.jwt_secret.startswith("change-this"):
                raise ValueError("Production requires a random JWT_SECRET of at least 32 characters.")
            if not self.allowed_origins:
                raise ValueError("Production requires explicit HTTPS CORS origins.")
            for origin in self.allowed_origins:
                parsed = urlsplit(origin)
                if (parsed.scheme != "https" or not parsed.hostname or parsed.username
                        or parsed.password or parsed.path or parsed.query or parsed.fragment
                        or "*" in origin):
                    raise ValueError("Production CORS origins must be explicit HTTPS origins without paths.")
        return self

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
