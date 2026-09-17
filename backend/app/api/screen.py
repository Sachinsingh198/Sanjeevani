from fastapi import APIRouter, UploadFile, File, HTTPException
import numpy as np
import cv2
from app.cv.screening import DiagnosticScreeningEngine
from app.schemas.vision_schemas import VisionScreenResponse

router = APIRouter(prefix="/screen", tags=["Edge Diagnostics"])
engine = DiagnosticScreeningEngine()

def _decode_image_file(contents: bytes) -> np.ndarray:
    """Decodes uploaded raw image bytes into an OpenCV BGR numpy array."""
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid or unsupported image format. Please upload JPG, PNG, or WEBP.")
    return img

@router.post("/anemia", response_model=VisionScreenResponse)
async def screen_anemia(file: UploadFile = File(...)):
    """
    Evaluates conjunctival pallor via the CIELAB Erythema Index (EI = a* / L*).
    Estimates Hemoglobin (Hb g/dL) and generates annotated ROI overlay.
    """
    contents = await file.read()
    img = _decode_image_file(contents)

    res = engine.screen_anemia(img)
    if "error" in res:
        raise HTTPException(status_code=422, detail=res["error"])

    return VisionScreenResponse(**res)

@router.post("/jaundice", response_model=VisionScreenResponse)
async def screen_jaundice(file: UploadFile = File(...)):
    """
    Evaluates scleral icterus in HSV color space & CIELAB b* yellow chromatic shift.
    Estimates Total Serum Bilirubin (mg/dL) and generates annotated ROI overlay.
    """
    contents = await file.read()
    img = _decode_image_file(contents)

    res = engine.screen_jaundice(img)
    if "error" in res:
        raise HTTPException(status_code=422, detail=res["error"])

    return VisionScreenResponse(**res)

@router.post("/oral", response_model=VisionScreenResponse)
async def screen_oral(file: UploadFile = File(...)):
    """
    Screens oral cavity photos for mucosal hyperkeratosis (Leukoplakia / White Patches)
    and erythroplakia, vital for rural tobacco/gutkha screening.
    """
    contents = await file.read()
    img = _decode_image_file(contents)

    res = engine.screen_oral(img)
    if "error" in res:
        raise HTTPException(status_code=422, detail=res["error"])

    return VisionScreenResponse(**res)

@router.post("/skin", response_model=VisionScreenResponse)
async def screen_skin(file: UploadFile = File(...)):
    """
    Screens dermatological photos for cutaneous erythema (inflammation),
    ringworm (Tinea fungal infection), and eczema lesions.
    """
    contents = await file.read()
    img = _decode_image_file(contents)

    res = engine.screen_skin(img)
    if "error" in res:
        raise HTTPException(status_code=422, detail=res["error"])

    return VisionScreenResponse(**res)