from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Forma Studio API"
    environment: str = "development"
    database_url: str = "postgresql+psycopg://forma:forma@localhost:5432/forma"
    cors_origins: str = "http://localhost:3000,http://localhost:3001"
    jwt_secret: str = "change-this-development-secret"
    access_token_minutes: int = 15
    refresh_token_days: int = 7
    admin_notification_email: str = "studio@example.com"
    resend_api_key: str = ""
    mail_from: str = "Forma Studio <notifications@example.com>"
    media_storage_path: str = "storage/media"

    model_config = SettingsConfigDict(env_file=".env", env_prefix="", extra="ignore")

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
