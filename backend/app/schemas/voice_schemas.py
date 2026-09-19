from pydantic import BaseModel
from typing import Optional


class TTSRequest(BaseModel):
    text: str
    # "hi" | "hindi" | "garhwali" | "en" — garhwali is transparently
    # mapped to the Hindi voice since there's no dedicated Garhwali model.
    language: str = "hi"
    gender: str = "female"  # "female" | "male"


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