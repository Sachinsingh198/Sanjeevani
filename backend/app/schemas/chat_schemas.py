from pydantic import BaseModel, Field
from typing import List, Optional

class PatientContext(BaseModel):
    age: Optional[int] = None
    gender: Optional[str] = None
    known_conditions: List[str] = Field(default_factory=list)

class ChatRequest(BaseModel):
    conversation_id: str
    message: str
    language_hint: str = "auto"
    patient_context: PatientContext = Field(default_factory=PatientContext)

class RemedyItem(BaseModel):
    remedy_name: str
    remedy_text: str
    ayurvedic_note: Optional[str] = None
    source: str
    safety_check: str

class ChatResponse(BaseModel):
    conversation_id: str
    reply_text: str
    tier: str
    flags: List[str]
    remedies: List[RemedyItem] = Field(default_factory=list)
    escalation_triggered: bool
    requires_immediate_doctor: bool
    # Dialogue phase exposed so the frontend PhaseProgress stepper is accurate
    phase: str = "GREETING"
    detected_language: str = "hindi"

class TTSRequest(BaseModel):
    text: str
    language: str = "hi"
    gender: str = "female"