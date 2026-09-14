import cv2
import numpy as np
from typing import Dict, Any
from app.cv.preprocessor import ImagePreprocessor

class DiagnosticScreeningEngine:
    """
    Mathematical color-space diagnostic screener for rural edge environments.
    Extracts true Erythema Index (Anemia) and Scleral Icterus Index (Jaundice).
    """

    def __init__(self):
        # Calibrated clinical thresholds based on true CIELAB a* and HSV
        self.anemia_pallor_threshold = 0.20  # EI < 0.20 indicates significant mucosal pallor
        self.jaundice_threshold = 0.35       # >35% of sclera pixels in yellow chromatic band

    def screen_anemia(self, conjunctiva_roi_bgr: np.ndarray) -> Dict[str, Any]:
        """
        Calculates mucosal redness ratio (Erythema Index: a* / L*) in true CIELAB space.
        """
        if conjunctiva_roi_bgr is None or conjunctiva_roi_bgr.size == 0:
            return {
                "screening_type": "ANEMIA",
                "error": "Invalid or empty Region of Interest (ROI) image."
            }

        # Step 1: Convert to float32 LAB so L* in [0, 100] and a* in [-128, 127]
        img_float = conjunctiva_roi_bgr.astype(np.float32) / 255.0
        lab = cv2.cvtColor(img_float, cv2.COLOR_BGR2LAB)
        l_channel, a_channel, _ = cv2.split(lab)

        mean_l = float(np.mean(l_channel)) + 1e-5
        mean_a = float(np.mean(a_channel))

        # True Erythema Index: ratio of positive red chromaticity to luminance
        # Positive a* indicates red mucosal capillary perfusion
        erythema_score = float(max(0.0, mean_a) / mean_l)
        is_at_risk = erythema_score < self.anemia_pallor_threshold

        return {
            "screening_type": "ANEMIA",
            "biomarker": "Conjunctival Erythema Index (EI)",
            "erythema_index": round(erythema_score, 4),
            "cutoff_threshold": self.anemia_pallor_threshold,
            "risk_level": "HIGH_ANEMIA_RISK" if is_at_risk else "NORMAL",
            "clinical_recommendation": (
                "Palpebral mucosal erythema index is below normal baseline. "
                "Recommend laboratory Complete Blood Count (CBC) at nearest Primary Health Centre."
                if is_at_risk else
                "Normal mucosal vascularization and conjunctival pallor baseline."
            )
        }

    def screen_jaundice(self, sclera_roi_bgr: np.ndarray) -> Dict[str, Any]:
        """
        Calculates yellowness ratio in HSV color space over the ocular sclera region.
        """
        if sclera_roi_bgr is None or sclera_roi_bgr.size == 0:
            return {
                "screening_type": "JAUNDICE",
                "error": "Invalid or empty Region of Interest (ROI) image."
            }

        # Step 1: Convert directly to HSV
        hsv = cv2.cvtColor(sclera_roi_bgr, cv2.COLOR_BGR2HSV)
        h_channel, s_channel, _ = cv2.split(hsv)

        # Step 2: Segment yellow chromatic band: Hue 15 to 38 and Saturation > 30
        yellow_mask = cv2.inRange(hsv, np.array([15, 30, 40]), np.array([38, 255, 255]))
        total_pixels = float(yellow_mask.size) + 1e-5
        yellow_pixel_count = float(np.sum(yellow_mask > 0))

        yellow_ratio = float(yellow_pixel_count / total_pixels)
        is_at_risk = yellow_ratio > self.jaundice_threshold

        return {
            "screening_type": "JAUNDICE",
            "biomarker": "Scleral Icterus Index (YI)",
            "icterus_index": round(yellow_ratio, 4),
            "cutoff_threshold": self.jaundice_threshold,
            "risk_level": "JAUNDICE_RISK" if is_at_risk else "NORMAL",
            "clinical_recommendation": (
                "Scleral yellow-shift detected above normal threshold. "
                "Recommend serum bilirubin laboratory test at CHC or District Hospital."
                if is_at_risk else
                "No significant scleral icterus detected. Normal baseline."
            )
        }