from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    """
    Central application configuration.
    Loads and validates all environment variables from .env on startup.
    """
    APP_ENV: str = "development"
    DEFAULT_LANGUAGE: str = "hi"

    # LLM Settings
    PRIMARY_LLM_PROVIDER: str = "groq"
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "qwen/qwen3.6-27b"
    
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"

    # Portkey Gateway Settings
    PORTKEY_API_KEY: Optional[str] = None
    PORTKEY_PROVIDER_SLUG: str = "groq-prod"
    PORTKEY_CONFIG_ID: Optional[str] = None
    LLM_MODEL: str = "@groq-prod/qwen-3.6-27b"

    # Observability (LangSmith)
    LANGSMITH_TRACING: bool = True
    LANGSMITH_PROJECT: str = "sanjeevani-2.0"
    LANGSMITH_API_KEY: Optional[str] = None

    # Vector Storage (Qdrant)
    QDRANT_PATH: str = "./qdrant_data"
    QDRANT_COLLECTION_NAME: str = "sanjeevani_remedies"
    QDRANT_URL: Optional[str] = None
    QDRANT_API_KEY: Optional[str] = None

    # Authentication (JWT)
    JWT_SECRET_KEY: str = "sanjeevani-2026-gopeshwar-secret"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Relational Database & LangGraph State Persistence
    DATABASE_URL: str = "sqlite:///./sanjeevani.db"
    CHECKPOINT_DB_PATH: str = "sqlite:///./sessions.db"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

# Instantiate a single global instance for import across all modules
settings = Settings()