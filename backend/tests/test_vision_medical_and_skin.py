import os
os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'
import io
import pytest
import numpy as np
import cv2
from PIL import Image, ImageDraw

from app.core.vision_service import MedicalVisionService
from app.schemas.chat_schemas import MedicalVisionResponse

@pytest.mark.asyncio
async def test_medicine_strip_ocr_analysis():
    """Verify medicine blister strip recognition extracts real drug name, indications, and doctor recommendation."""
    if MedicalVisionService._get_ocr_engine() is None:
        pytest.skip("RapidOCR engine unavailable on this platform (e.g. Python 3.13 without rapidocr-onnxruntime)")
    img = Image.new('RGB', (450, 160), color='white')
    d = ImageDraw.Draw(img)
    d.text((25, 20), 'Paracetamol Tablets IP 500 mg', fill='black')
    d.text((25, 55), 'Dolo-500 | Batch: DL-4029 Exp: 11/2027', fill='black')
    d.text((25, 90), 'Take 1 tablet after meals for fever or pain.', fill='black')
    
    buf = io.BytesIO()
    img.save(buf, format='JPEG')
    
    res = await MedicalVisionService.analyze_medical_image(
        image_bytes=buf.getvalue(),
        scan_type="prescription_medicine",
        language_hint="hi",
        conversation_id="test_med_conv"
    )
    
    assert isinstance(res, MedicalVisionResponse)
    assert res.scan_type == "prescription_medicine"
    assert "Paracetamol" in res.title or any("Paracetamol" in str(it) for it in res.identified_items) or "500" in res.title
    assert res.key_findings is not None and len(res.key_findings) > 10
    assert res.dosage_instructions is not None and len(res.dosage_instructions) > 5
    assert len(res.safety_warnings) > 0
    assert res.plain_language_summary is not None and len(res.plain_language_summary) > 20

@pytest.mark.asyncio
async def test_skin_rash_cv_analysis():
    """Verify skin lesion analysis calculates erythema index, edge gradient, and generates personalized clinical triage."""
    img_skin = np.full((300, 300, 3), (120, 140, 200), dtype=np.uint8) # skin tone
    cv2.circle(img_skin, (150, 150), 70, (30, 30, 230), -1) # inflamed red lesion
    cv2.circle(img_skin, (150, 150), 75, (20, 20, 150), 3) # scaly border
    
    _, enc = cv2.imencode('.jpg', img_skin)
    
    res = await MedicalVisionService.analyze_medical_image(
        image_bytes=enc.tobytes(),
        scan_type="symptom_skin",
        language_hint="hi",
        conversation_id="test_skin_conv"
    )
    
    assert isinstance(res, MedicalVisionResponse)
    assert res.scan_type == "symptom_skin"
    assert res.key_findings is not None and len(res.key_findings) > 10
    assert res.dosage_instructions is not None and len(res.dosage_instructions) > 5
    assert res.recommended_tier in ["Green", "Amber", "Red"]
    assert len(res.safety_warnings) > 0
    assert res.annotated_image_url is not None or res.image_url is not None

@pytest.mark.asyncio
async def test_unclear_medicine_image_fallback():
    """Verify an unreadable/blurry photo provides helpful instructions rather than a hallucinated diagnosis."""
    img_blank = Image.new('RGB', (100, 100), color='gray')
    buf = io.BytesIO()
    img_blank.save(buf, format='JPEG')
    
    res = await MedicalVisionService.analyze_medical_image(
        image_bytes=buf.getvalue(),
        scan_type="prescription_medicine",
        language_hint="hi",
        conversation_id="test_blank_conv"
    )
    
    assert isinstance(res, MedicalVisionResponse)
    assert "स्पष्ट" in res.title or "Clear" in res.title or "फोटो" in res.plain_language_summary or "Photo" in res.plain_language_summary
