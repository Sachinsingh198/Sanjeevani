import pytest
import numpy as np
import cv2
from app.cv.preprocessor import ImagePreprocessor
from app.cv.screening import DiagnosticScreeningEngine

@pytest.fixture
def engine():
    return DiagnosticScreeningEngine()

def test_gray_world_preprocessing():
    """Ensure Gray-World balances skewed single-channel tints."""
    red_tinted = np.zeros((100, 100, 3), dtype=np.uint8)
    red_tinted[:, :, 2] = 220  # High Red
    red_tinted[:, :, 1] = 50   # Low Green
    red_tinted[:, :, 0] = 50   # Low Blue

    balanced = ImagePreprocessor.apply_gray_world(red_tinted)
    assert balanced.shape == (100, 100, 3)
    assert np.mean(balanced[:, :, 1]) > 50

def test_anemia_pale_screening(engine):
    """A pale/washed-out mucosal sample must trigger HIGH_ANEMIA_RISK."""
    pale_sample = np.zeros((64, 64, 3), dtype=np.uint8)
    pale_sample[:, :, 0] = 190  # Blue
    pale_sample[:, :, 1] = 190  # Green
    pale_sample[:, :, 2] = 195  # Barely any red difference

    result = engine.screen_anemia(pale_sample)
    assert result["screening_type"] == "ANEMIA"
    assert result["risk_level"] == "HIGH_ANEMIA_RISK"
    assert result["erythema_index"] < 0.20
    assert "Estimated Hb" in result["estimated_metric"]
    assert result["annotated_image_base64"].startswith("data:image/jpeg;base64,")
    assert result["abdm_fhir_report"]["resourceType"] == "DiagnosticReport"

def test_anemia_healthy_red_screening(engine):
    """A healthy pink/red vascularized mucosa should evaluate to NORMAL."""
    healthy_mucosa = np.zeros((64, 64, 3), dtype=np.uint8)
    healthy_mucosa[:, :, 0] = 60   # Low Blue
    healthy_mucosa[:, :, 1] = 70   # Low Green
    healthy_mucosa[:, :, 2] = 210  # Rich Red perfusion

    result = engine.screen_anemia(healthy_mucosa)
    assert result["screening_type"] == "ANEMIA"
    assert result["risk_level"] == "NORMAL"
    assert result["erythema_index"] >= 0.20
    assert result["confidence_score"] > 0.6

def test_anemia_full_eye_detection(engine):
    """Ensure a full simulated eye image is automatically processed without error."""
    full_eye = np.full((300, 400, 3), (160, 140, 130), dtype=np.uint8)  # skin
    cv2.ellipse(full_eye, (200, 130), (90, 45), 0, 0, 360, (230, 235, 240), -1)  # sclera
    cv2.circle(full_eye, (200, 130), 28, (60, 40, 30), -1)  # iris
    cv2.circle(full_eye, (200, 130), 10, (10, 10, 10), -1)  # pupil
    cv2.ellipse(full_eye, (200, 190), (70, 15), 0, 0, 180, (70, 80, 200), -1)  # vascular lower eyelid

    result = engine.screen_anemia(full_eye)
    assert result["screening_type"] == "ANEMIA"
    assert "estimated_metric" in result
    assert result["annotated_image_base64"].startswith("data:image/jpeg;base64,")

def test_jaundice_yellow_screening(engine):
    """A yellow-tinted sclera sample must trigger JAUNDICE_RISK."""
    yellow_sclera = np.zeros((64, 64, 3), dtype=np.uint8)
    yellow_sclera[:, :, 0] = 30   # Low Blue
    yellow_sclera[:, :, 1] = 210  # High Green
    yellow_sclera[:, :, 2] = 230  # High Red (Yellow in BGR)

    result = engine.screen_jaundice(yellow_sclera)
    assert result["screening_type"] == "JAUNDICE"
    assert result["risk_level"] == "JAUNDICE_RISK"
    assert result["icterus_index"] > 0.30
    assert "Estimated Bilirubin" in result["estimated_metric"]
    assert result["annotated_image_base64"].startswith("data:image/jpeg;base64,")

def test_oral_leukoplakia_screening(engine):
    """Screens oral mucosa with white hyperkeratotic plaque."""
    oral_img = np.full((120, 120, 3), (90, 90, 180), dtype=np.uint8)  # pink mucosa
    # Add white patch
    oral_img[30:90, 30:90] = (245, 245, 250)

    result = engine.screen_oral(oral_img)
    assert result["screening_type"] == "ORAL_MUCOSA"
    assert "ORAL_LESION_SUSPECTED" in result["risk_level"]
    assert result["calculated_index"] > 0.20
    assert "keratosis" in result["biomarker"].lower()

def test_skin_erythema_screening(engine):
    """Screens inflamed erythematous skin lesion."""
    skin_img = np.full((100, 100, 3), (120, 140, 200), dtype=np.uint8)  # skin
    # Add inflamed central erythema
    skin_img[25:75, 25:75] = (30, 40, 230)

    result = engine.screen_skin(skin_img)
    assert result["screening_type"] == "SKIN_LESION"
    assert "ACTIVE_INFLAMMATION_RISK" in result["risk_level"]
    assert "Erythema" in result["biomarker"]
    assert result["roi_localization_method"] == "estimated"

def test_mediapipe_detected_eye_localization(engine):
    """
    Verifies that an image with detectable facial and ocular geometry
    triggers real MediaPipe localization with roi_localization_method == 'detected'.
    """
    face_img = np.full((400, 400, 3), (180, 190, 220), dtype=np.uint8)  # background
    # Face head contour
    cv2.ellipse(face_img, (200, 200), (120, 160), 0, 0, 360, (130, 150, 200), -1)
    # Eyes with sclera and pupils
    cv2.circle(face_img, (160, 170), 16, (255, 255, 255), -1)
    cv2.circle(face_img, (160, 170), 8, (20, 20, 20), -1)
    # Vascular lower lid
    cv2.ellipse(face_img, (160, 185), (14, 6), 0, 0, 180, (50, 60, 210), -1)
    # Right eye
    cv2.circle(face_img, (240, 170), 16, (255, 255, 255), -1)
    cv2.circle(face_img, (240, 170), 8, (20, 20, 20), -1)
    cv2.ellipse(face_img, (240, 185), (14, 6), 0, 0, 180, (50, 60, 210), -1)
    # Mouth
    cv2.ellipse(face_img, (200, 270), (40, 15), 0, 0, 360, (50, 50, 180), -1)

    result = engine.screen_anemia(face_img)
    assert result["screening_type"] == "ANEMIA"
    assert result["roi_localization_method"] == "detected"
    assert "estimated_metric" in result
    assert result["annotated_image_base64"].startswith("data:image/jpeg;base64,")

    # Jaundice screening on same face
    jaundice_res = engine.screen_jaundice(face_img)
    assert jaundice_res["screening_type"] == "JAUNDICE"
    assert jaundice_res["roi_localization_method"] == "detected"

def test_mediapipe_fallback_on_headless_crop(engine):
    """
    Confirms that tightly cropped or non-face patches gracefully
    fall back to roi_localization_method == 'estimated'.
    """
    patch = np.zeros((80, 80, 3), dtype=np.uint8)
    patch[:, :, 2] = 200

    result = engine.screen_anemia(patch)
    assert result["roi_localization_method"] == "estimated"