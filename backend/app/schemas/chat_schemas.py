from pydantic import BaseModel, Field
from typing import List, Optional

class PatientContext(BaseModel):
    age: Optional[int] = Field(None, ge=0, le=125)
    gender: Optional[str] = Field(None, max_length=20)
    pregnancy: Optional[bool] = None
    known_conditions: List[str] = Field(default_factory=list)

class ChatRequest(BaseModel):
    conversation_id: str = Field(..., min_length=1, max_length=128)
    message: str = Field(..., min_length=1, max_length=2000)
    language_hint: str = Field("auto", max_length=30)
    patient_context: PatientContext = Field(default_factory=PatientContext)
    include_audio: bool = False
    voice_gender: str = Field("female", max_length=20)

class RemedyItem(BaseModel):
    remedy_name: str
    remedy_text: str
    ayurvedic_note: Optional[str] = None
    source: str
    safety_check: str

class ConsultationSummary(BaseModel):
    condition: Optional[str] = None
    possible_cause: Optional[str] = None
    remedy_name: Optional[str] = None
    preparation_steps: List[str] = Field(default_factory=list)
    dosage: List[str] = Field(default_factory=list)
    precautions: List[str] = Field(default_factory=list)
    ayurvedic_note: Optional[str] = None

class ChatResponse(BaseModel):
    conversation_id: str
    reply_text: str
    spoken_reply_text: Optional[str] = None
    tier: str
    flags: List[str]
    remedies: List[RemedyItem] = Field(default_factory=list)
    escalation_triggered: bool
    requires_immediate_doctor: bool
    # Dialogue phase exposed so the frontend PhaseProgress stepper is accurate
    phase: str = "GREETING"
    detected_language: str = "hindi"
    disclaimer: Optional[str] = None
    audio_base64: Optional[str] = None
    audio_format: Optional[str] = None
    consultation_summary: Optional[ConsultationSummary] = None

class TTSRequest(BaseModel):
    text: str
    language: str = "hi"
    gender: str = "female"