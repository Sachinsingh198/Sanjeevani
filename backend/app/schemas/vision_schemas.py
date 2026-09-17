from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class VisionScreenResponse(BaseModel):
    screening_type: str
    biomarker: str
    calculated_index: float
    cutoff_threshold: float
    risk_level: str
    clinical_recommendation: str
    estimated_metric: Optional[str] = Field(None, description="Clinical estimate such as Hb (g/dL) or Serum Bilirubin (mg/dL)")
    confidence_score: Optional[float] = Field(None, description="Confidence score between 0.0 and 1.0 based on image lighting and ROI quality")
    quality_assessment: Optional[str] = Field(None, description="Lighting and photographic quality metrics")
    ayurvedic_recommendation: Optional[str] = Field(None, description="Ayurvedic CCRAS supportive dietary herbs")
    annotated_image_base64: Optional[str] = Field(None, description="Base64 encoded JPEG data URL showing diagnostic ROI and heatmap overlays")
    abdm_fhir_report: Optional[Dict[str, Any]] = Field(None, description="Structured HL7 ABDM FHIR DiagnosticReport & Observation bundle")
    error: Optional[str] = None