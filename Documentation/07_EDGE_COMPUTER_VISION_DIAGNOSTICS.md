# 07. Edge Computer Vision Diagnostics

## 1. Decentralized Non-Invasive Optical Screening

In remote mountain health camps or doorstep visits by ASHA workers, access to laboratory diagnostic machinery (such as hematology analyzers for Hemoglobin or centrifuges for Serum Bilirubin) is virtually non-existent.

Sanjeevani integrates **non-invasive, optical edge computer vision algorithms** in [`backend/app/cv/screening.py`](file:///d:/Sanjeevani/backend/app/cv/screening.py).

### Core Engineering Principles:
- **Pure CPU Execution**: Built with standard **OpenCV (`opencv-python-headless`)** and **NumPy**; does not require high-end GPU servers.
- **Privacy by Design**: Patient photos are processed in memory and never uploaded to public cloud vision APIs or persistent cloud storage.
- **Mathematical Color Space Modeling**: Uses established biomedical optical techniques (CIELAB Erythema Index and HSV chromatic analysis) rather than black-box image classification.

---

## 2. The Four Diagnostic Screening Modalities

```
┌────────────────────────────────────────────────────────────────────────┐
│                   EDGE COMPUTER VISION SCREENING SUITE                 │
├────────────────────────────────────────────────────────────────────────┤
│  1. Conjunctival Pallor / Anemia (/screen/anemia)                      │
│     - Target: Palpebral conjunctiva (pulled lower eyelid)              │
│     - Algorithm: CIELAB Erythema Index (EI = a* / L*)                  │
│     - Output: Estimated Hemoglobin (g/dL) & Pallor Severity            │
├────────────────────────────────────────────────────────────────────────┤
│  2. Scleral Icterus / Jaundice (/screen/jaundice)                      │
│     - Target: Eye white (sclera)                                       │
│     - Algorithm: HSV masking & CIELAB b* yellow chromatic shift        │
│     - Output: Estimated Serum Bilirubin (mg/dL) & Icterus Severity     │
├────────────────────────────────────────────────────────────────────────┤
│  3. Oral Cavity Mucosal Screening (/screen/oral)                       │
│     - Target: Buccal mucosa, inner cheek, tongue                       │
│     - Algorithm: White/Red mucosal hyperkeratosis segmentation         │
│     - Output: Leukoplakia / Erythroplakia pre-cancerous lesion alerts  │
├────────────────────────────────────────────────────────────────────────┤
│  4. Dermatological Lesions (/screen/skin)                              │
│     - Target: Cutaneous skin rashes and patches                        │
│     - Algorithm: Contour circularity, annular border analysis          │
│     - Output: Tinea (ringworm fungal) and Eczema erythema detection    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Mathematical Foundations of the Algorithms

### A. Anemia Screening via Erythema Index (EI)

The palpebral conjunctiva of the eye contains microvascular capillary beds without interfering skin melanocytes, making it an ideal non-invasive biomarker for blood hemoglobin levels.

1. **Illumination Correction**: The eye image undergoes bilateral filtering to remove specular highlights while preserving vascular edges.
2. **CIELAB Conversion**: RGB is converted to CIELAB space, where:
   - $L^*$: Perceptual lightness ($0=$ black, $100=$ diffuse white).
   - $a^*$: Red-green chromatic axis (positive values = red, negative = green).
   - $b^*$: Yellow-blue chromatic axis (positive values = yellow, negative = blue).
3. **Erythema Index Calculation**:
   $$\text{EI} = \frac{a^*}{L^*}$$
4. **Hemoglobin Calibration Formula**:
   $$\text{Hb}_{\text{est}} \approx 13.5 \times \text{EI}$$
5. **Clinical Classification**:
   - $\text{Hb} \ge 12.0\text{ g/dL}$: Normal / Non-Anemic
   - $10.0 \le \text{Hb} < 12.0\text{ g/dL}$: Mild Pallor
   - $7.0 \le \text{Hb} < 10.0\text{ g/dL}$: Moderate Pallor (ASHA referral recommended)
   - $\text{Hb} < 7.0\text{ g/dL}$: Severe Pallor (Immediate Medical Evaluation)

---

### B. Jaundice Screening via Scleral Icterus

Excess serum bilirubin ($>2.5\text{ mg/dL}$) binds preferentially to elastin fibers in the sclera of the eye, producing noticeable yellow pigmentation before cutaneous jaundice appears.

1. **Sclera Segmentation**: Converts the eye image to **HSV (Hue-Saturation-Value)** space:
   - Filters out pupil/iris pixels ($V < 50$ or high saturation).
   - Keeps bright, low-saturation scleral tissue.
2. **Yellow Chromatic Shift**: Evaluates the mean value of the $b^*$ channel in CIELAB space across the segmented sclera mask.
3. **Bilirubin Estimation**:
   $$\text{Bilirubin}_{\text{est}} = \max\left(0.4, \; \frac{b^*_{\text{mean}} - 120.0}{6.5} \times 1.2 + 0.8\right)$$
4. **Clinical Classification**:
   - $\text{Bilirubin} < 1.2\text{ mg/dL}$: Normal Range
   - $1.2 \le \text{Bilirubin} < 2.5\text{ mg/dL}$: Borderline Sub-Clinical Icterus
   - $2.5 \le \text{Bilirubin} < 5.0\text{ mg/dL}$: Moderate Scleral Icterus (Liver/Gallbladder evaluation)
   - $\text{Bilirubin} \ge 5.0\text{ mg/dL}$: Severe Hyperbilirubinemia (Urgent Medical Care)

---

### C. Oral Cavity Mucosal Screening

Rural communities often exhibit high usage of smokeless tobacco, *gutkha*, and *bidi*, predisposing users to oral submucous fibrosis (OSMF) and pre-cancerous lesions:
- **Leukoplakia Detection**: Evaluates high-lightness, low-erythema mucosal patches ($L^* > 180$ in normalized oral space) with irregular contour boundaries.
- **Erythroplakia Detection**: Identifies velvety, intense red mucosal patches with elevated $a^*$ chromatic saturation.
- Generates a visual bounding box and heatmap overlay indicating suspicious tissue areas to guide ASHA worker referrals.

---

## 4. API Request & Visual Output

The `/screen/*` endpoints receive a standard image file upload (`multipart/form-data`) and return a structured `VisionScreenResponse`:

```json
{
  "condition": "anemia",
  "metric_name": "Hemoglobin (Hb)",
  "estimated_value": 9.4,
  "unit": "g/dL",
  "status": "Moderate Pallor",
  "confidence": 0.88,
  "clinical_insight": "Conjunctival pallor suggests moderate microcytic anemia. Diet rich in green leafy vegetables, iron jaggery (gud), and primary health center confirmation recommended.",
  "overlay_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "requires_doctor_visit": true
}
```
The frontend automatically renders the annotated overlay image with the segmented Region of Interest (ROI) highlighted in emerald and amber contours.
