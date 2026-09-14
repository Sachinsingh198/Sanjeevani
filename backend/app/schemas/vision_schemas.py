from pydantic import BaseModel
from typing import Optional

class VisionScreenResponse(BaseModel):
    screening_type: str
    biomarker: str
    calculated_index: float
    cutoff_threshold: float
    risk_level: str
    clinical_recommendation: str
    error: Optional[str] = None