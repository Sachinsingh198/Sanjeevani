from pydantic import BaseModel
from typing import Optional


class TTSRequest(BaseModel):
    text: str
    # "hi" | "hindi" | "garhwali" | "en" — garhwali is transparently
    # mapped to the Hindi voice since there's no dedicated Garhwali model.
    language: str = "hi"
    gender: str = "female"  # "female" | "male"
    provider: Optional[str] = None  # "bhashini" | "sarvam" | "neural_indic"
    model: Optional[str] = None     # e.g. "bulbul:v3", "bulbul:v2", or Bhashini pipeline ID
    speaker: Optional[str] = None   # e.g. "meera", "arvind", "pavithra", "sharma"


class TTSResponse(BaseModel):
    audio_base64: str
    format: str = "wav"
    language: str
    provider: str = "ai4bharat"


class TTSErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None


class STTRequest(BaseModel):
    language_code: Optional[str] = "hi-IN"
    model: str = "saaras:v3"
    mode: str = "codemix"


class STTResponse(BaseModel):
    transcript: str
    language_code: str = "hi-IN"
    confidence: Optional[float] = None
    provider: str = "sarvam"


class VoiceProviderConfigRequest(BaseModel):
    provider: Optional[str] = None  # "bhashini" or "sarvam"
    sarvam_model: Optional[str] = None
    sarvam_speaker: Optional[str] = None
    bhashini_model: Optional[str] = None
    bhashini_gender: Optional[str] = None
    clear_cache: Optional[bool] = False


class VoiceProviderConfigResponse(BaseModel):
    primary: str
    fallback: str
    offline_fallback: str = "neural_indic"
    bhashini_configured: bool
    sarvam_configured: bool
    sarvam_model: str = "bulbul:v3"
    sarvam_speaker: str = "meera"
    bhashini_model: str = "ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4"
    bhashini_gender: str = "female"
    available_sarvam_models: list = []
    available_sarvam_speakers: list = []
    available_sarvam_speakers_by_model: Optional[dict] = None
    available_bhashini_models: list = []
    available_bhashini_genders: list = []
    status: str = "ok"