"""
MPLADS RISE — Configuration
Loads settings from environment variables / .env file.
"""
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://mplads_user:mplads_pass@localhost:5432/mplads_rise"
    
    # ChromaDB
    chroma_host: str = "localhost"
    chroma_port: int = 8001
    chroma_collection: str = "mplads_guidelines"
    
    # Gemini
    gemini_api_key: str = ""
    gemini_model: str = "gemini-1.5-flash"
    
    # Security
    secret_key: str = "change-this-in-production-please"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480
    admin_username: str = "admin"
    admin_password: str
    
    # App
    app_env: str = "development"
    frontend_url: str = "http://localhost:3000"
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
