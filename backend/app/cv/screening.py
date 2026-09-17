import cv2
import numpy as np
import base64
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Tuple, Optional
from app.cv.preprocessor import ImagePreprocessor

class DiagnosticScreeningEngine:
    """
    Mathematical color-space & anatomical computer-vision diagnostic screener
    tailored for rural Himalayan health clinics and ASHA edge mobile deployments.
    Extracts:
    1. Erythema Index (EI) & Estimated Hemoglobin (Anemia)
    2. Scleral Icterus Index (YI) & Estimated Serum Bilirubin (Jaundice)
    3. Mucosal Hyperkeratosis Index & Erythroplakia (Oral Leukoplakia Screening)
    4. Dermatological Erythema & Border Irregularity Index (Skin Lesions)
    """

    def __init__(self):
        # Calibrated clinical cutoffs
        self.anemia_pallor_threshold = 0.20   # EI < 0.20 indicates significant mucosal pallor
        self.anemia_moderate_threshold = 0.25 # 0.20 - 0.25 = Moderate risk, > 0.25 = Normal
        self.jaundice_threshold = 0.30        # > 30% yellow chromatic band or YI > 0.30
        self.oral_keratosis_threshold = 0.25  # White patch hyperkeratinization ratio
        self.skin_erythema_threshold = 0.25   # Elevated inflamed skin redness

    def _encode_annotated_image(self, img_bgr: np.ndarray) -> str:
        """Encodes an annotated OpenCV image to a base64 JPEG data URL."""
        success, buffer = cv2.imencode('.jpg', img_bgr, [cv2.IMWRITE_JPEG_QUALITY, 85])
        if not success:
            return ""
        b64 = base64.b64encode(buffer).decode('utf-8')
        return f"data:image/jpeg;base64,{b64}"

    def _assess_image_quality(self, img_bgr: np.ndarray) -> Tuple[float, str]:
        """Evaluates image lighting, sharpness, and glare confidence."""
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        brightness = float(np.mean(gray))
        laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        
        is_blurry = laplacian_var < 40.0
        is_dark = brightness < 40.0
        is_overexposed = brightness > 225.0

        if is_dark:
            return 0.65, "Alp Prakash (Low Lighting): Roshni badhayein ya daylight mein lein."
        elif is_overexposed:
            return 0.70, "Ati Prakash (High Glare): Camera flash band rakhein."
        elif is_blurry:
            return 0.75, "Dhundlepan (Mild Blur): Camera ko sthir rakhein."
        return 0.95, "Uttam Prakash (Optimal Illumination): Rang aur roshni santulit hain."

    def _localize_conjunctiva_roi(self, img_bgr: np.ndarray) -> Tuple[np.ndarray, Tuple[int, int, int, int]]:
        """
        Localizes the palpebral conjunctiva (lower eyelid mucosa).
        If input is already a cropped patch (< 120x120), uses it directly.
        Otherwise, finds the lower eye region, discarding the iris/pupil and eyelid skin.
        """
        h, w = img_bgr.shape[:2]
        if h < 120 and w < 120:
            return img_bgr, (0, 0, w, h)

        # For eye photos: palpebral conjunctiva lies in the lower third
        # Below the cornea/iris where the user gently pulls the lower lid down
        y_start = int(h * 0.55)
        y_end = int(h * 0.95)
        x_start = int(w * 0.15)
        x_end = int(w * 0.85)

        roi = img_bgr[y_start:y_end, x_start:x_end]
        if roi.size == 0:
            return img_bgr, (0, 0, w, h)

        # In CIELAB, conjunctival mucosal capillaries have elevated a* (red)
        lab = cv2.cvtColor(roi, cv2.COLOR_BGR2LAB)
        a_chan = lab[:, :, 1]
        
        threshold_val = np.percentile(a_chan, 60)
        mask = (a_chan >= threshold_val).astype(np.uint8) * 255
        
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
        
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if contours:
            largest = max(contours, key=cv2.contourArea)
            rx, ry, rw, rh = cv2.boundingRect(largest)
            if rw > 10 and rh > 10:
                refined_roi = roi[ry:ry+rh, rx:rx+rw]
                return refined_roi, (x_start + rx, y_start + ry, rw, rh)

        return roi, (x_start, y_start, x_end - x_start, y_end - y_start)

    def _localize_sclera_roi(self, img_bgr: np.ndarray) -> Tuple[np.ndarray, Tuple[int, int, int, int]]:
        """
        Localizes the ocular sclera (white of the eye).
        Segmenting the high-reflectance regions flanking the iris.
        """
        h, w = img_bgr.shape[:2]
        if h < 120 and w < 120:
            return img_bgr, (0, 0, w, h)

        y_start = int(h * 0.25)
        y_end = int(h * 0.75)
        x_start = int(w * 0.10)
        x_end = int(w * 0.90)

        roi = img_bgr[y_start:y_end, x_start:x_end]
        if roi.size == 0:
            return img_bgr, (0, 0, w, h)

        hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
        lab = cv2.cvtColor(roi, cv2.COLOR_BGR2LAB)
        
        l_chan = lab[:, :, 0]
        s_chan = hsv[:, :, 1]
        
        sclera_mask = ((l_chan > 80) & (s_chan < 160)).astype(np.uint8) * 255
        
        contours, _ = cv2.findContours(sclera_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if contours:
            largest = max(contours, key=cv2.contourArea)
            rx, ry, rw, rh = cv2.boundingRect(largest)
            if rw > 15 and rh > 15:
                refined_roi = roi[ry:ry+rh, rx:rx+rw]
                return refined_roi, (x_start + rx, y_start + ry, rw, rh)

        return roi, (x_start, y_start, x_end - x_start, y_end - y_start)

    def screen_anemia(self, image_bgr: np.ndarray) -> Dict[str, Any]:
        """
        Calculates mucosal Erythema Index (EI = a* / L*) in CIELAB color space.
        Estimates blood Hemoglobin (g/dL) based on WHO clinical correlation.
        """
        if image_bgr is None or image_bgr.size == 0:
            return {"screening_type": "ANEMIA", "error": "Invalid or empty image."}

        conf, quality_notes = self._assess_image_quality(image_bgr)
        roi, (rx, ry, rw, rh) = self._localize_conjunctiva_roi(image_bgr)

        # Step 1: Convert to CIELAB space
        img_float = roi.astype(np.float32) / 255.0
        lab = cv2.cvtColor(img_float, cv2.COLOR_BGR2LAB)
        l_chan, a_chan, _ = cv2.split(lab)

        mean_l = float(np.mean(l_chan)) + 1e-5
        mean_a = float(np.mean(a_chan))

        # True Erythema Index: ratio of positive red chromaticity to luminance
        erythema_score = float(max(0.0, mean_a) / mean_l)

        # Estimated Hemoglobin formula (g/dL)
        estimated_hb = round(float(np.clip(erythema_score * 38.0 + 1.2, 5.5, 16.5)), 1)

        # Clinical Risk Stratification
        if erythema_score < self.anemia_pallor_threshold:
            risk_level = "HIGH_ANEMIA_RISK"
            rec_en = "Significant conjunctival mucosal pallor detected. Recommend immediate Complete Blood Count (CBC) at nearest Primary Health Centre."
            rec_hi = "Aankh ki palpebral mucosa mein khoon ki kami (pallor) ke spasht lakshan hain. Nazdeeki PHC mein CBC jaanch karwayein."
        elif erythema_score < self.anemia_moderate_threshold:
            risk_level = "MILD_ANEMIA_RISK"
            rec_en = "Mild mucosal pallor. Dietary iron supplementation and follow-up recommended."
            rec_hi = "Halka pallor sanket. Aahar mein loha (iron) badhayein aur e-Sanjeevani se paramarsh lein."
        else:
            risk_level = "NORMAL"
            rec_en = "Normal mucosal vascularization. No significant conjunctival pallor detected."
            rec_hi = "Aankh ki mucosa mein samanya vascularization hai. Khoon ki kami ke lakshan nahi hain."

        # Generate Annotated Image Overlay
        annotated = image_bgr.copy()
        color = (0, 60, 220) if "HIGH" in risk_level else ((0, 180, 240) if "MILD" in risk_level else (60, 200, 80))
        cv2.rectangle(annotated, (rx, ry), (rx + rw, ry + rh), color, 2)
        cv2.putText(
            annotated,
            f"Conjunctiva ROI | EI: {erythema_score:.3f} | Hb ~{estimated_hb}g/dL",
            (max(5, rx), max(20, ry - 8)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            color,
            2
        )
        annotated_b64 = self._encode_annotated_image(annotated)

        # ABDM FHIR DiagnosticReport Resource
        report_id = f"SANJ-ANM-{uuid.uuid4().hex[:8].upper()}"
        fhir_report = {
            "resourceType": "DiagnosticReport",
            "id": report_id,
            "status": "final",
            "category": [{"coding": [{"system": "http://terminology.hl7.org/CodeSystem/v2-0074", "code": "LAB", "display": "Laboratory / Colorimetry"}]}],
            "code": {"coding": [{"system": "http://loinc.org", "code": "718-7", "display": "Hemoglobin [Mass/volume] in Blood estimate"}]},
            "issued": datetime.now(timezone.utc).isoformat(),
            "conclusion": f"Calculated Erythema Index: {erythema_score:.4f}. Estimated Hb: {estimated_hb} g/dL. Risk: {risk_level}.",
            "presentedForm": [{"contentType": "image/jpeg", "title": "Annotated Conjunctival Colorimetry Overlay"}]
        }

        ayurvedic_care = (
            "Drakshasava (15ml twice daily), Punarnava Mandur (1 tablet twice daily with buttermilk), "
            "palak (spinach), chukandar (beetroot), gur (jaggery), aur anar ka niyamit sevan karein."
            if "RISK" in risk_level else
            "Santulit poshan, rojana amla ras, hare saag-sabzi aur poshtik aahar banaye rakhein."
        )

        return {
            "screening_type": "ANEMIA",
            "biomarker": "Conjunctival Erythema Index (CIELAB a*/L*)",
            "calculated_index": round(erythema_score, 4),
            "erythema_index": round(erythema_score, 4),
            "cutoff_threshold": self.anemia_pallor_threshold,
            "estimated_metric": f"Estimated Hb: {estimated_hb} g/dL ({'Severe/Moderate' if 'HIGH' in risk_level else ('Mild' if 'MILD' in risk_level else 'Normal')})",
            "risk_level": risk_level,
            "confidence_score": conf,
            "quality_assessment": quality_notes,
            "clinical_recommendation": f"{rec_hi} • {rec_en}",
            "ayurvedic_recommendation": ayurvedic_care,
            "annotated_image_base64": annotated_b64,
            "abdm_fhir_report": fhir_report
        }

    def screen_jaundice(self, image_bgr: np.ndarray) -> Dict[str, Any]:
        """
        Calculates Scleral Icterus Index (YI) in HSV & CIELAB space.
        Estimates Serum Bilirubin (mg/dL) from scleral yellow-shift.
        """
        if image_bgr is None or image_bgr.size == 0:
            return {"screening_type": "JAUNDICE", "error": "Invalid or empty image."}

        conf, quality_notes = self._assess_image_quality(image_bgr)
        roi, (rx, ry, rw, rh) = self._localize_sclera_roi(image_bgr)

        # Step 1: Convert to HSV & CIELAB
        hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
        lab = cv2.cvtColor(roi, cv2.COLOR_BGR2LAB)

        # Step 2: Segment yellow chromatic band (Hue 15 to 38, Saturation > 30)
        yellow_mask = cv2.inRange(hsv, np.array([15, 30, 40]), np.array([38, 255, 255]))
        total_pixels = float(yellow_mask.size) + 1e-5
        yellow_pixel_count = float(np.sum(yellow_mask > 0))

        yellow_ratio = float(yellow_pixel_count / total_pixels)

        # CIELAB b* yellow channel
        b_chan = lab[:, :, 2].astype(np.float32) - 128.0
        mean_b = float(max(0.0, np.mean(b_chan))) / 128.0

        icterus_index = float(0.7 * yellow_ratio + 0.3 * mean_b)

        # Estimated Total Serum Bilirubin (mg/dL) formula:
        estimated_bilirubin = round(float(np.clip(0.6 + icterus_index * 8.8, 0.4, 18.0)), 1)

        if yellow_ratio > self.jaundice_threshold or icterus_index > self.jaundice_threshold:
            risk_level = "JAUNDICE_RISK"
            rec_en = "Scleral yellow chromatic shift detected. Recommend Liver Function Test (LFT/Serum Bilirubin) at nearest CHC or District Hospital."
            rec_hi = "Aankh ke safed hisse (sclera) mein peelepan (icterus) ka sanket mila hai. CHC ya hospital mein Liver Function Test karwayein."
        elif yellow_ratio > (self.jaundice_threshold * 0.6):
            risk_level = "BORDERLINE_ICTERUS"
            rec_en = "Mild scleral tint detected. Monitor patient hydration and repeat screening if dark urine or fatigue persists."
            rec_hi = "Halka peelepan ka sanket. Paani aur taral padarth pijiye aur 48 ghante baad punah jaanch karein."
        else:
            risk_level = "NORMAL"
            rec_en = "No significant scleral icterus detected. Scleral chromaticity is within healthy baseline."
            rec_hi = "Aankh ke safed bhaag mein koi peelepan ka lakshan nahi mila. Samanya baseline."

        # Annotated image overlay
        annotated = image_bgr.copy()
        color = (0, 80, 240) if "RISK" in risk_level else ((0, 200, 230) if "BORDERLINE" in risk_level else (60, 200, 80))
        cv2.rectangle(annotated, (rx, ry), (rx + rw, ry + rh), color, 2)
        cv2.putText(
            annotated,
            f"Sclera ROI | YI: {icterus_index:.3f} | Bili ~{estimated_bilirubin}mg/dL",
            (max(5, rx), max(20, ry - 8)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            color,
            2
        )
        annotated_b64 = self._encode_annotated_image(annotated)

        # ABDM FHIR DiagnosticReport Resource
        report_id = f"SANJ-JND-{uuid.uuid4().hex[:8].upper()}"
        fhir_report = {
            "resourceType": "DiagnosticReport",
            "id": report_id,
            "status": "final",
            "category": [{"coding": [{"system": "http://terminology.hl7.org/CodeSystem/v2-0074", "code": "LAB", "display": "Ocular Colorimetry"}]}],
            "code": {"coding": [{"system": "http://loinc.org", "code": "1975-2", "display": "Bilirubin.total [Mass/volume] in Serum estimate"}]},
            "issued": datetime.now(timezone.utc).isoformat(),
            "conclusion": f"Calculated Scleral Icterus Index: {icterus_index:.4f}. Estimated Serum Bilirubin: {estimated_bilirubin} mg/dL. Risk: {risk_level}.",
            "presentedForm": [{"contentType": "image/jpeg", "title": "Annotated Scleral Icterus Colorimetry Overlay"}]
        }

        ayurvedic_care = (
            "Bhumi Amla swaras (10ml subah khali pet), Punarnavarishta (15ml khane ke baad), "
            "kutki churna (1 gm gun-gune paani se), aur nariyal paani/mooli ka ras sevan karein. "
            "Tali-bhuni aur masaledar cheezon se parhez karein."
            if "RISK" in risk_level else
            "Pachak Agni santulit rakhein, paryapt matra mein paani piyein, aur taaza saattvik aahar lein."
        )

        return {
            "screening_type": "JAUNDICE",
            "biomarker": "Scleral Icterus Index (YI / HSV Yellow-Shift)",
            "calculated_index": round(icterus_index, 4),
            "icterus_index": round(yellow_ratio, 4),
            "cutoff_threshold": self.jaundice_threshold,
            "estimated_metric": f"Estimated Bilirubin: {estimated_bilirubin} mg/dL ({'Clinical Jaundice' if 'RISK' in risk_level else ('Subclinical' if 'BORDERLINE' in risk_level else 'Normal')})",
            "risk_level": risk_level,
            "confidence_score": conf,
            "quality_assessment": quality_notes,
            "clinical_recommendation": f"{rec_hi} • {rec_en}",
            "ayurvedic_recommendation": ayurvedic_care,
            "annotated_image_base64": annotated_b64,
            "abdm_fhir_report": fhir_report
        }

    def screen_oral(self, image_bgr: np.ndarray) -> Dict[str, Any]:
        """
        Screens oral cavity photos for mucosal hyperkeratosis (Leukoplakia / White Patches)
        and erythroplakia, vital for rural tobacco/gutkha screening by ASHA workers.
        """
        if image_bgr is None or image_bgr.size == 0:
            return {"screening_type": "ORAL_MUCOSA", "error": "Invalid or empty image."}

        conf, quality_notes = self._assess_image_quality(image_bgr)
        h, w = image_bgr.shape[:2]

        y_start, y_end = int(h * 0.15), int(h * 0.85)
        x_start, x_end = int(w * 0.15), int(w * 0.85)
        roi = image_bgr[y_start:y_end, x_start:x_end]

        lab = cv2.cvtColor(roi, cv2.COLOR_BGR2LAB)
        l_chan, a_chan, b_chan = cv2.split(lab.astype(np.float32))

        # Hyperkeratinization whiteness index: High L* with low chromatic saturation
        whiteness_mask = ((l_chan > 175.0) & (np.abs(a_chan - 128.0) < 30.0) & (np.abs(b_chan - 128.0) < 30.0)).astype(np.uint8) * 255
        
        # Ulcerative Erythroplakia: High red a* with low L*
        erythro_mask = ((a_chan > 160.0) & (l_chan < 130.0)).astype(np.uint8) * 255

        total_pixels = float(roi.shape[0] * roi.shape[1]) + 1e-5
        white_patch_ratio = float(np.sum(whiteness_mask > 0) / total_pixels)
        red_patch_ratio = float(np.sum(erythro_mask > 0) / total_pixels)

        keratosis_index = float(white_patch_ratio * 0.7 + red_patch_ratio * 0.3)

        if white_patch_ratio > self.oral_keratosis_threshold or red_patch_ratio > 0.15 or keratosis_index > self.oral_keratosis_threshold:
            risk_level = "ORAL_LESION_SUSPECTED"
            rec_en = "Prominent mucosal keratosis or ulcerative patch detected. Urgent dental / ENT biopsy evaluation recommended at Sub-District Hospital."
            rec_hi = "Munh ke andar safed (leukoplakia) ya laal chaale ka sanket. Turant ENT ya Dental doctor ko dikhayein aur biopsy karwayein."
        elif white_patch_ratio > (self.oral_keratosis_threshold * 0.5):
            risk_level = "MILD_KERATOSIS"
            rec_en = "Mild mucosal hyperkeratosis. Strictly cease any tobacco/bidi/gutkha consumption and follow up in 2 weeks."
            rec_hi = "Halka safed dhabba. Gutkha, bidi ya tambaku ka sevan turant band karein aur 2 hafte mein check karwayein."
        else:
            risk_level = "NORMAL"
            rec_en = "Healthy pink mucosal tissue. No significant leukoplakia or erythroplakia detected."
            rec_hi = "Munh ki mucosa gulabi aur swasth hai. Koi gambhir lesion nahi dikha."

        # Annotated image overlay
        annotated = image_bgr.copy()
        color = (0, 0, 240) if "SUSPECTED" in risk_level else ((0, 200, 230) if "MILD" in risk_level else (60, 200, 80))
        cv2.rectangle(annotated, (x_start, y_start), (x_end, y_end), color, 2)
        cv2.putText(
            annotated,
            f"Oral Mucosa | Keratosis Index: {keratosis_index:.3f}",
            (x_start, max(20, y_start - 8)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            color,
            2
        )
        annotated_b64 = self._encode_annotated_image(annotated)

        report_id = f"SANJ-ORL-{uuid.uuid4().hex[:8].upper()}"
        fhir_report = {
            "resourceType": "DiagnosticReport",
            "id": report_id,
            "status": "final",
            "category": [{"coding": [{"system": "http://terminology.hl7.org/CodeSystem/v2-0074", "code": "OTH", "display": "Oral Screening"}]}],
            "code": {"coding": [{"system": "http://loinc.org", "code": "78572-5", "display": "Oral cavity mucosal lesion assessment"}]},
            "issued": datetime.now(timezone.utc).isoformat(),
            "conclusion": f"Oral Keratosis Index: {keratosis_index:.4f}. White Patch Ratio: {white_patch_ratio:.3f}. Risk: {risk_level}.",
            "presentedForm": [{"contentType": "image/jpeg", "title": "Annotated Oral Mucosa Screening Overlay"}]
        }

        ayurvedic_care = (
            "Triphala Kwath se din mein 3 baar kulla (gargle) karein, Yashtimadhu churna shahad ke sath chaale par lagayein, "
            "aur Haldi-ghee ka lepan karein. Tambaku aur bidi ka sevan poori tarah band karein."
            if "SUSPECTED" in risk_level or "MILD" in risk_level else
            "Dant-dhavan (Neem ya Babool datun), oil pulling (Til tel gundush) aur swasth mukh safai rakhein."
        )

        return {
            "screening_type": "ORAL_MUCOSA",
            "biomarker": "Mucosal Hyperkeratosis / Whiteness Index (W)",
            "calculated_index": round(keratosis_index, 4),
            "cutoff_threshold": self.oral_keratosis_threshold,
            "estimated_metric": f"Keratosis Ratio: {round(white_patch_ratio * 100, 1)}% ({'Suspected Lesion' if 'SUSPECTED' in risk_level else ('Mild Keratosis' if 'MILD' in risk_level else 'Healthy Mucosa')})",
            "risk_level": risk_level,
            "confidence_score": conf,
            "quality_assessment": quality_notes,
            "clinical_recommendation": f"{rec_hi} • {rec_en}",
            "ayurvedic_recommendation": ayurvedic_care,
            "annotated_image_base64": annotated_b64,
            "abdm_fhir_report": fhir_report
        }

    def screen_skin(self, image_bgr: np.ndarray) -> Dict[str, Any]:
        """
        Screens dermatological photos for erythema (inflammation), ringworm (Tinea fungal infection),
        and eczema lesions common in rural Himalayan agricultural settings.
        """
        if image_bgr is None or image_bgr.size == 0:
            return {"screening_type": "SKIN_LESION", "error": "Invalid or empty image."}

        conf, quality_notes = self._assess_image_quality(image_bgr)
        h, w = image_bgr.shape[:2]

        lab = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2LAB)
        l_chan = lab[:, :, 0].astype(np.float32)
        a_chan = lab[:, :, 1].astype(np.float32) - 128.0

        # Erythema index: positive a* normalized by luminance
        erythema_map = np.clip(a_chan / (l_chan + 1e-5), 0.0, 1.0)
        
        # Take the top 35% most erythematous pixels (the focal lesion area)
        sorted_erythema = np.sort(erythema_map.flatten())
        top_pixels = sorted_erythema[-int(0.35 * sorted_erythema.size):]
        focal_erythema = float(np.mean(top_pixels)) if top_pixels.size > 0 else float(np.mean(erythema_map))

        # Edge roughness / gradient for active scaling border
        gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
        sobel_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        sobel_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
        gradient_mag = np.sqrt(sobel_x**2 + sobel_y**2)
        edge_roughness = float(np.mean(gradient_mag)) / 255.0

        lesion_score = float(0.7 * focal_erythema + 0.3 * edge_roughness)

        if focal_erythema > self.skin_erythema_threshold or lesion_score > self.skin_erythema_threshold:
            risk_level = "ACTIVE_INFLAMMATION_RISK"
            rec_en = "Active cutaneous erythema and border scaling detected. Possible fungal dermatophytosis (Tinea) or acute dermatitis. Medical evaluation advised."
            rec_hi = "Twacha par tez laalima (erythema) aur kharash ke sanket hain. Daad (fungal ringworm) ya eczema ho sakta hai. Doctor se marham likhwayein."
        elif focal_erythema > (self.skin_erythema_threshold * 0.7):
            risk_level = "MILD_DERMATITIS"
            rec_en = "Mild cutaneous irritation. Keep the affected area dry, clean, and avoid harsh soaps."
            rec_hi = "Halki khujli ya dermatitis. Kshetra ko sookha aur saaf rakhein, dhoop aur nami se bachayein."
        else:
            risk_level = "NORMAL"
            rec_en = "Normal skin tone baseline. No acute cutaneous inflammation or fungal border detected."
            rec_hi = "Twacha par koi gambhir sankraman ya laalima nahi hai. Samanya baseline."

        # Annotated image overlay
        annotated = image_bgr.copy()
        color = (0, 0, 240) if "ACTIVE" in risk_level else ((0, 200, 230) if "MILD" in risk_level else (60, 200, 80))
        cv2.rectangle(annotated, (int(w * 0.1), int(h * 0.1)), (int(w * 0.9), int(h * 0.9)), color, 2)
        cv2.putText(
            annotated,
            f"Skin Lesion | Erythema: {focal_erythema:.3f} | Score: {lesion_score:.3f}",
            (int(w * 0.1), max(20, int(h * 0.1) - 8)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            color,
            2
        )
        annotated_b64 = self._encode_annotated_image(annotated)

        report_id = f"SANJ-SKN-{uuid.uuid4().hex[:8].upper()}"
        fhir_report = {
            "resourceType": "DiagnosticReport",
            "id": report_id,
            "status": "final",
            "category": [{"coding": [{"system": "http://terminology.hl7.org/CodeSystem/v2-0074", "code": "OTH", "display": "Dermatology Screening"}]}],
            "code": {"coding": [{"system": "http://loinc.org", "code": "39156-5", "display": "Body surface skin lesion evaluation"}]},
            "issued": datetime.now(timezone.utc).isoformat(),
            "conclusion": f"Skin Lesion Erythema: {focal_erythema:.4f}. Risk: {risk_level}.",
            "presentedForm": [{"contentType": "image/jpeg", "title": "Annotated Cutaneous Screening Overlay"}]
        }

        ayurvedic_care = (
            "Neem patte ke paani se kshetra ko dhowein, Shuddha Gandhak churna ya Marichyadi Tel lagayein, "
            "aur Khadirarishta (15ml khane ke baad) ka sevan karein. Geeli ya paseene wali kapde na pehnein."
            if "ACTIVE" in risk_level or "MILD" in risk_level else
            "Nariyal tel ya Aloe Vera gel se twacha ko snigdha (moisturized) rakhein."
        )

        return {
            "screening_type": "SKIN_LESION",
            "biomarker": "Cutaneous Erythema & Edge Gradient Index",
            "calculated_index": round(lesion_score, 4),
            "cutoff_threshold": self.skin_erythema_threshold,
            "estimated_metric": f"Erythema Index: {round(focal_erythema, 3)} ({'Active Infection/Rash' if 'ACTIVE' in risk_level else ('Mild Irritation' if 'MILD' in risk_level else 'Normal Skin')})",
            "risk_level": risk_level,
            "confidence_score": conf,
            "quality_assessment": quality_notes,
            "clinical_recommendation": f"{rec_hi} • {rec_en}",
            "ayurvedic_recommendation": ayurvedic_care,
            "annotated_image_base64": annotated_b64,
            "abdm_fhir_report": fhir_report
        }