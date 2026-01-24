from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    app_name: str = "Slop Feed API"
    debug: bool = False

    # Supabase
    supabase_url: str
    supabase_publishable_key: str  # For client-facing operations
    supabase_service_key: str  # For admin operations (user management, etc.)

    # Anthropic
    anthropic_api_key: str

    # Redis
    redis_url: str = "redis://localhost:6379"

    # Daytona
    daytona_api_url: str = ""
    daytona_api_key: str = ""

    @property
    def supabase_jwks_url(self) -> str:
        """JWKS URL for JWT verification (auto-derived from supabase_url)."""
        return f"{self.supabase_url}/auth/v1/.well-known/jwks.json"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
