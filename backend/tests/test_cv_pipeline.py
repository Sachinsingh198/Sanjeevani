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
    # Synthetic pale mucosal tissue (low red chromaticity)
    pale_sample = np.zeros((64, 64, 3), dtype=np.uint8)
    pale_sample[:, :, 0] = 190  # Blue
    pale_sample[:, :, 1] = 190  # Green
    pale_sample[:, :, 2] = 195  # Barely any red difference

    result = engine.screen_anemia(pale_sample)
    assert result["screening_type"] == "ANEMIA"
    assert result["risk_level"] == "HIGH_ANEMIA_RISK"
    assert result["erythema_index"] < 0.20

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

def test_jaundice_yellow_screening(engine):
    """A yellow-tinted sclera sample must trigger JAUNDICE_RISK."""
    yellow_sclera = np.zeros((64, 64, 3), dtype=np.uint8)
    yellow_sclera[:, :, 0] = 30   # Low Blue
    yellow_sclera[:, :, 1] = 210  # High Green
    yellow_sclera[:, :, 2] = 230  # High Red (Yellow in BGR)

    result = engine.screen_jaundice(yellow_sclera)
    assert result["screening_type"] == "JAUNDICE"
    assert result["risk_level"] == "JAUNDICE_RISK"
    assert result["icterus_index"] > 0.35