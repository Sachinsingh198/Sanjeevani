import os
import cv2
import numpy as np
import urllib.request
import logging
from typing import Optional, Dict, Any, Tuple

import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

logger = logging.getLogger("sanjeevani.face_landmarks")

MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task"

# MediaPipe 468+ Face Mesh Landmark indices
LEFT_EYE_LANDMARKS = [
    33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246
]
RIGHT_EYE_LANDMARKS = [
    263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466
]
LIP_LANDMARKS = [
    61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95,
    0, 11, 12, 13, 14, 15, 16, 17
]

_detector_instance: Optional[vision.FaceLandmarker] = None

def _get_model_path() -> str:
    """Resolves local model file path, downloading to models_cache if absent."""
    base_dir = os.getcwd()
    models_dir = os.path.join(base_dir, "models_cache")
    os.makedirs(models_dir, exist_ok=True)
    model_path = os.path.join(models_dir, "face_landmarker.task")

    if not os.path.exists(model_path) or os.path.getsize(model_path) < 1000000:
        logger.info(f"Downloading face_landmarker.task from {MODEL_URL}...")
        try:
            urllib.request.urlretrieve(MODEL_URL, model_path)
            logger.info(f"face_landmarker.task saved ({os.path.getsize(model_path)} bytes)")
        except Exception as e:
            logger.error(f"Failed to download face_landmarker.task: {e}")
            raise
    return model_path

def get_face_landmarker() -> Optional[vision.FaceLandmarker]:
    """Singleton getter for MediaPipe Face Landmarker."""
    global _detector_instance
    if _detector_instance is not None:
        return _detector_instance

    try:
        model_path = _get_model_path()
        base_options = python.BaseOptions(model_asset_path=model_path)
        options = vision.FaceLandmarkerOptions(
            base_options=base_options,
            output_face_blendshapes=False,
            output_facial_transformation_matrixes=False,
            num_faces=1,
            min_face_detection_confidence=0.5,
            min_face_presence_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        _detector_instance = vision.FaceLandmarker.create_from_options(options)
        return _detector_instance
    except Exception as e:
        logger.warning(f"Could not initialize MediaPipe FaceLandmarker: {e}")
        return None

def _compute_padded_bbox(
    landmarks,
    indices,
    img_w: int,
    img_h: int,
    pad_x_pct: float = 0.20,
    pad_y_top_pct: float = 0.20,
    pad_y_bottom_pct: float = 0.40,
) -> Tuple[int, int, int, int]:
    """Computes a padded bounding box around a subset of landmarks."""
    xs = [landmarks[i].x * img_w for i in indices]
    ys = [landmarks[i].y * img_h for i in indices]

    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)

    w = max_x - min_x
    h = max_y - min_y

    pad_x = w * pad_x_pct
    pad_y_top = h * pad_y_top_pct
    pad_y_bot = h * pad_y_bottom_pct

    x0 = max(0, int(min_x - pad_x))
    y0 = max(0, int(min_y - pad_y_top))
    x1 = min(img_w, int(max_x + pad_x))
    y1 = min(img_h, int(max_y + pad_y_bot))

    return x0, y0, max(1, x1 - x0), max(1, y1 - y0)

def locate_eye_regions(image_bgr: np.ndarray) -> Optional[Dict[str, Any]]:
    """
    Detects face landmarks in an image and locates eye bounding boxes.
    Returns:
        dict with 'left_eye', 'right_eye', 'primary_eye' (x, y, w, h)
        or None if no face is detected or image is too small.
    """
    if image_bgr is None or image_bgr.size == 0:
        return None

    img_h, img_w = image_bgr.shape[:2]
    # If image is an extreme close-up cropped patch without facial context
    if img_h < 120 and img_w < 120:
        return None

    detector = get_face_landmarker()
    if detector is None:
        return None

    try:
        rgb_image = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)
        result = detector.detect(mp_img)

        if not result or not result.face_landmarks or len(result.face_landmarks) == 0:
            return None

        landmarks = result.face_landmarks[0]

        # Extra padding on bottom (pad_y_bottom_pct=0.45) captures the palpebral conjunctiva
        # where the patient gently pulls down the lower lid
        left_eye_bbox = _compute_padded_bbox(
            landmarks, LEFT_EYE_LANDMARKS, img_w, img_h,
            pad_x_pct=0.15, pad_y_top_pct=0.15, pad_y_bottom_pct=0.45
        )
        right_eye_bbox = _compute_padded_bbox(
            landmarks, RIGHT_EYE_LANDMARKS, img_w, img_h,
            pad_x_pct=0.15, pad_y_top_pct=0.15, pad_y_bottom_pct=0.45
        )

        # Primary eye selection: select the one with larger area or closer to center
        center_x = img_w / 2.0
        dist_left = abs((left_eye_bbox[0] + left_eye_bbox[2] / 2.0) - center_x)
        dist_right = abs((right_eye_bbox[0] + right_eye_bbox[2] / 2.0) - center_x)
        primary_eye = left_eye_bbox if dist_left <= dist_right else right_eye_bbox

        return {
            "left_eye": left_eye_bbox,
            "right_eye": right_eye_bbox,
            "primary_eye": primary_eye,
        }
    except Exception as err:
        logger.warning(f"Error in locate_eye_regions: {err}")
        return None

def locate_mouth_region(image_bgr: np.ndarray) -> Optional[Tuple[int, int, int, int]]:
    """
    Detects face landmarks in an image and locates mouth/buccal bounding box.
    Returns:
        (x, y, w, h) bounding box or None if no face is detected.
    """
    if image_bgr is None or image_bgr.size == 0:
        return None

    img_h, img_w = image_bgr.shape[:2]
    if img_h < 120 and img_w < 120:
        return None

    detector = get_face_landmarker()
    if detector is None:
        return None

    try:
        rgb_image = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)
        result = detector.detect(mp_img)

        if not result or not result.face_landmarks or len(result.face_landmarks) == 0:
            return None

        landmarks = result.face_landmarks[0]
        mouth_bbox = _compute_padded_bbox(
            landmarks, LIP_LANDMARKS, img_w, img_h,
            pad_x_pct=0.25, pad_y_top_pct=0.25, pad_y_bottom_pct=0.25
        )
        return mouth_bbox
    except Exception as err:
        logger.warning(f"Error in locate_mouth_region: {err}")
        return None
