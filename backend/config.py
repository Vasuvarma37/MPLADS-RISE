"""
MPLADS RISE — Configuration
Loads settings from environment variables / .env file.
"""
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str
    
    # Security
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480
    
    # App
    app_env: str = "development"
    frontend_url: str
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
