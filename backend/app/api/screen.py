from fastapi import APIRouter, UploadFile, File, HTTPException
import numpy as np
import cv2
from app.cv.screening import DiagnosticScreeningEngine
from app.schemas.vision_schemas import VisionScreenResponse

router = APIRouter(prefix="/screen", tags=["Edge Diagnostics"])
engine = DiagnosticScreeningEngine()

@router.post("/anemia", response_model=VisionScreenResponse)
async def screen_anemia(file: UploadFile = File(...)):
    """
    Evaluates conjunctival pallor via the CIELAB Erythema Index (EI).
    """
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image file format.")

    res = engine.screen_anemia(img)
    if "error" in res:
        raise HTTPException(status_code=422, detail=res["error"])

    return VisionScreenResponse(
        screening_type=res["screening_type"],
        biomarker=res["biomarker"],
        calculated_index=res["erythema_index"],
        cutoff_threshold=res["cutoff_threshold"],
        risk_level=res["risk_level"],
        clinical_recommendation=res["clinical_recommendation"]
    )

@router.post("/jaundice", response_model=VisionScreenResponse)
async def screen_jaundice(file: UploadFile = File(...)):
    """
    Evaluates scleral icterus in HSV color space.
    """
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image file format.")

    res = engine.screen_jaundice(img)
    if "error" in res:
        raise HTTPException(status_code=422, detail=res["error"])

    return VisionScreenResponse(
        screening_type=res["screening_type"],
        biomarker=res["biomarker"],
        calculated_index=res["icterus_index"],
        cutoff_threshold=res["cutoff_threshold"],
        risk_level=res["risk_level"],
        clinical_recommendation=res["clinical_recommendation"]
    )