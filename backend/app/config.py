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
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"

    # Hugging Face Token (for gated models like ai4bharat/indic-parler-tts)
    HF_TOKEN: Optional[str] = None

    # Voice / TTS Settings: "sarvam" (Sarvam AI bulbul:v3), "neural" (Edge TTS), or "ai4bharat" (local 2.2B model)
    TTS_PROVIDER: str = "sarvam"
    SARVAM_API_KEY: Optional[str] = None
    SARVAM_TTS_MODEL: str = "bulbul:v3"
    SARVAM_FEMALE_SPEAKER: str = "shreya"
    SARVAM_MALE_SPEAKER: str = "rahul"

    # Portkey Gateway Settings
    PORTKEY_API_KEY: Optional[str] = None
    PORTKEY_PROVIDER_SLUG: str = "groq-prod"
    PORTKEY_CONFIG_ID: Optional[str] = None
    LLM_MODEL: str = "@groq-prod/openai/gpt-oss-120b"

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

    # # Bhashini (Digital India / MeitY) TTS — pure Indian-accent voice
    # BHASHINI_USER_ID: str = ""
    # BHASHINI_ULCA_API_KEY: str = ""
    # BHASHINI_PIPELINE_ID: str = "64392f96daac500b55c543cd"
    # BHASHINI_AUTH_URL: str = "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline"

    AI4BHARAT_TTS_MODEL: str = "ai4bharat/indic-parler-tts"
    AI4BHARAT_TTS_DEVICE: str = "cpu"   # set to "cuda" if you have a GPU — much faster
    AI4BHARAT_HINDI_FEMALE_SPEAKER: str = "Divya"
    AI4BHARAT_HINDI_MALE_SPEAKER: str = "Rohit"

    # SMTP / Gmail Notification Service (for OTP verification and password reset)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None  # e.g., yourname@gmail.com
    SMTP_PASSWORD: Optional[str] = None  # 16-character Google App Password
    EMAIL_FROM: Optional[str] = "Sanjeevani Health <noreply@sanjeevani.gov.in>"

    # SMS Gateway Configuration
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_FROM_NUMBER: Optional[str] = None
    FAST2SMS_API_KEY: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

# Instantiate a single global instance for import across all modules
settings = Settings()