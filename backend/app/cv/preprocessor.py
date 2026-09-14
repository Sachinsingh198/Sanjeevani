import cv2
import numpy as np

class ImagePreprocessor:
    """
    Image calibration and illumination normalization pipeline for non-invasive
    clinical biomarker extraction under variable lighting conditions.
    """

    @staticmethod
    def apply_gray_world(image_bgr: np.ndarray) -> np.ndarray:
        """
        Calibrates color temperature using the Gray-World assumption.
        Forces the average scene reflectance to neutral gray.
        """
        if image_bgr is None or image_bgr.size == 0:
            return image_bgr

        b, g, r = cv2.split(image_bgr.astype(np.float32))
        r_avg = np.mean(r) + 1e-5
        g_avg = np.mean(g) + 1e-5
        b_avg = np.mean(b) + 1e-5

        gray_avg = (r_avg + g_avg + b_avg) / 3.0

        r_norm = np.clip(r * (gray_avg / r_avg), 0, 255)
        g_norm = np.clip(g * (gray_avg / g_avg), 0, 255)
        b_norm = np.clip(b * (gray_avg / b_avg), 0, 255)

        return cv2.merge([b_norm, g_norm, r_norm]).astype(np.uint8)

    @staticmethod
    def apply_clahe(image_bgr: np.ndarray, clip_limit: float = 2.0) -> np.ndarray:
        """
        Applies Contrast Limited Adaptive Histogram Equalization on the Luminance (L) channel
        in CIELAB space to reveal subtle mucosal vascularization without blowing out highlights.
        """
        if image_bgr is None or image_bgr.size == 0:
            return image_bgr

        lab = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)

        clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(8, 8))
        l_enhanced = clahe.apply(l)

        return cv2.cvtColor(cv2.merge([l_enhanced, a, b]), cv2.COLOR_LAB2BGR)