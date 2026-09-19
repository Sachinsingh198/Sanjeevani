import os
from typing import Optional
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

# Load .env file into environment immediately
load_dotenv()


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
    SARVAM_CHAT_MODEL: str = "sarvam-30b"

    # Portkey Gateway Settings
    PORTKEY_API_KEY: Optional[str] = None
    PORTKEY_PROVIDER_SLUG: str = "groq-prod"
    PORTKEY_CONFIG_ID: Optional[str] = None
    LLM_MODEL: str = "@groq-prod/openai/gpt-oss-120b"

    # Observability & Tracing (LangSmith / LangChain)
    LANGCHAIN_TRACING_V2: bool = True
    LANGCHAIN_ENDPOINT: str = "https://api.smith.langchain.com"
    LANGCHAIN_API_KEY: Optional[str] = None
    LANGCHAIN_PROJECT: str = "sanjeevani"

    LANGSMITH_TRACING: bool = True
    LANGSMITH_PROJECT: str = "sanjeevani"
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

    # AI4Bharat Local TTS (indic-parler-tts)
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

# Synchronize LangSmith / LangChain tracing environment variables into os.environ
# so that LangChain, LangGraph, and LangSmith global tracers automatically trace all runs
_langsmith_key = (
    settings.LANGCHAIN_API_KEY
    or settings.LANGSMITH_API_KEY
    or os.getenv("LANGCHAIN_API_KEY")
    or os.getenv("LANGSMITH_API_KEY")
)
if _langsmith_key:
    os.environ["LANGCHAIN_API_KEY"] = _langsmith_key
    os.environ["LANGSMITH_API_KEY"] = _langsmith_key

_langsmith_project = (
    settings.LANGCHAIN_PROJECT
    or settings.LANGSMITH_PROJECT
    or os.getenv("LANGCHAIN_PROJECT")
    or os.getenv("LANGSMITH_PROJECT")
    or "sanjeevani"
)
os.environ["LANGCHAIN_PROJECT"] = _langsmith_project
os.environ["LANGSMITH_PROJECT"] = _langsmith_project

_endpoint = (
    settings.LANGCHAIN_ENDPOINT
    or os.getenv("LANGCHAIN_ENDPOINT")
    or "https://api.smith.langchain.com"
)
os.environ["LANGCHAIN_ENDPOINT"] = _endpoint
os.environ["LANGSMITH_ENDPOINT"] = _endpoint

if (
    settings.LANGCHAIN_TRACING_V2
    or settings.LANGSMITH_TRACING
    or os.getenv("LANGCHAIN_TRACING_V2", "false").lower() == "true"
):
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGSMITH_TRACING"] = "true"