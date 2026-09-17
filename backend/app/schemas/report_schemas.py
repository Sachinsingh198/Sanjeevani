from pydantic import BaseModel, Field
from typing import List, Optional
from app.schemas.chat_schemas import RemedyItem


class ConsultationReportRequest(BaseModel):
    """
    Everything needed to render a printable consultation summary. The
    frontend already holds all of this in the Chat page's state at the
    moment a consultation concludes — patient identity/village comes from
    the authenticated user server-side (see reports.py), not from the
    client, so it can't be spoofed.
    """
    conversation_id: str
    tier: str  # "Green" | "Yellow" | "Red"
    flags: List[str] = Field(default_factory=list)
    remedies: List[RemedyItem] = Field(default_factory=list)
    consultation_summary: str = ""   # the bot's final reply / consultation notes
    detected_language: Optional[str] = "hindi"