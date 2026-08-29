"""
MPLADS RISE — Configuration
Loads settings from environment variables / .env file.
"""
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database — set DATABASE_URL in Render environment variables to your Supabase URL
    database_url: str = "sqlite:///./mplads_rise.db"
    
    # Security
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480
    
    # App
    app_env: str = "development"
    # FRONTEND_URL is used for CORS. Set it in Render env vars to your frontend URL.
    # The backend's _build_cors_origins() function handles http/https variants automatically.
    frontend_url: str = "http://localhost:5174"
    rate_limit_ai: int = 10  # requests per minute

    model_config = {
        "env_file": os.path.join(os.path.dirname(__file__), "..", ".env"), 
        "extra": "ignore"
    }


_settings_instance: "Settings | None" = None


def get_settings() -> Settings:
    global _settings_instance
    if _settings_instance is None:
        _settings_instance = Settings()
    return _settings_instance


def reload_settings() -> Settings:
    """Force reload of settings from disk (e.g. after .env change)."""
    global _settings_instance
    _settings_instance = Settings()
    return _settings_instance
