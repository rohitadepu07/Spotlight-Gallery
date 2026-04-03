import json
from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    app_name: str = "Spotlight Backend"
    environment: str = "development"
    debug: bool = True
    api_v1_prefix: str = "/api/v1"

    cors_origins: str = "http://localhost:5173"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/spotlight"
    auto_create_tables: bool = True

    storage_backend: str = "local"
    local_storage_path: str = "./storage"
    public_base_url: str = "http://localhost:8000/storage"
    frontend_base_url: str = "http://localhost:5173"

    s3_bucket_name: str | None = None
    s3_region: str | None = None
    s3_public_base_url: str | None = None

    cloudinary_cloud_name: str | None = None
    cloudinary_api_key: str | None = None
    cloudinary_api_secret: str | None = None
    cloudinary_folder: str = "spotlight"

    face_engine: str = "mock"
    match_threshold: float = 0.50
    embedding_dimension: int = 128

    @field_validator("cors_origins", mode="before")
    @classmethod
    def normalize_cors_origins(cls, value: str) -> str:
        return value.strip()

    def cors_origins_list(self) -> list[str]:
        raw = self.cors_origins.strip()
        if not raw:
            return []

        # Accept JSON array (e.g. ["http://localhost:5173"]) or CSV.
        if raw.startswith("["):
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, list):
                    return [str(item).strip() for item in parsed if str(item).strip()]
            except json.JSONDecodeError:
                pass

        return [item.strip() for item in raw.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
