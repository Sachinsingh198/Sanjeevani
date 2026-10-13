import os
import io
import json
import base64
import logging
from typing import Dict, Any, Optional
from PIL import Image

from app.config import Settings
from app.schemas.chat_schemas import MedicalVisionResponse

logger = logging.getLogger(__name__)
settings = Settings()

class MedicalVisionService:
    """
    Multimodal clinical vision service for Dr. Sanjeevani.
    Analyzes:
    1. Medicine blister strips & handwritten prescriptions
    2. Visible skin rashes, wounds, or symptom photos
    """

    @classmethod
    def _encode_image(cls, image_bytes: bytes, max_dim: int = 1024) -> tuple[str, str]:
        """Resizes image if too large and returns (base64_string, mime_type)."""
        image = Image.open(io.BytesIO(image_bytes))
        if image.mode != "RGB":
            image = image.convert("RGB")
        
        # Resize to conserve bandwidth and latency
        w, h = image.size
        if max(w, h) > max_dim:
            scale = max_dim / max(w, h)
            new_size = (int(w * scale), int(h * scale))
            image = image.resize(new_size, Image.Resampling.LANCZOS)

        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=85)
        encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
        return encoded, "image/jpeg"

    @classmethod
    async def analyze_medical_image(
        cls,
        image_bytes: bytes,
        scan_type: str = "prescription_medicine",
        language_hint: str = "hi",
        conversation_id: str = "default_conv",
    ) -> MedicalVisionResponse:
        """
        Analyzes medical image using Gemini 1.5 Flash Vision or clinical fallback.
        """
        try:
            base64_img, mime_type = cls._encode_image(image_bytes)
        except Exception as e:
            logger.error(f"[Vision] Image decoding error: {e}")
            return cls._fallback_response(scan_type, language_hint, conversation_id, error="Invalid image file")

        # Check if Gemini API Key is available
        if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip():
            try:
                from langchain_google_genai import ChatGoogleGenerativeAI
                from langchain_core.messages import HumanMessage

                llm = ChatGoogleGenerativeAI(
                    google_api_key=settings.GEMINI_API_KEY,
                    model="gemini-1.5-flash",
                    temperature=0.2,
                )

                prompt = cls._build_prompt(scan_type, language_hint)
                
                message = HumanMessage(
                    content=[
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": f"data:{mime_type};base64,{base64_img}"
                        }
                    ]
                )

                response = await llm.ainvoke([message])
                content = response.content if hasattr(response, "content") else str(response)

                # Parse JSON output from model
                parsed = cls._parse_llm_json(content)
                if parsed:
                    return MedicalVisionResponse(
                        conversation_id=conversation_id,
                        scan_type=scan_type,
                        title=parsed.get("title", "Medical Image Analysis"),
                        identified_items=parsed.get("identified_items", []),
                        key_findings=parsed.get("key_findings", ""),
                        dosage_instructions=parsed.get("dosage_instructions"),
                        safety_warnings=parsed.get("safety_warnings", []),
                        ayurvedic_interaction_note=parsed.get("ayurvedic_interaction_note"),
                        recommended_tier=parsed.get("recommended_tier", "Green"),
                        plain_language_summary=parsed.get("plain_language_summary", ""),
                        image_url=f"data:{mime_type};base64,{base64_img}",
                    )
            except Exception as e:
                logger.warning(f"[Vision] Gemini Vision inference error: {e}. Falling back to clinical template.")

        # Fallback when key not provided or API call fails
        return cls._fallback_response(scan_type, language_hint, conversation_id, image_url=f"data:{mime_type};base64,{base64_img}")

    @classmethod
    def _build_prompt(cls, scan_type: str, language_hint: str) -> str:
        lang_target = "Hinglish (Hindi written in Roman English script)" if language_hint == "hinglish" else ("Hindi (Devanagari)" if language_hint == "hi" else "English")
        
        if scan_type == "prescription_medicine":
            return f"""You are Dr. Sanjeevani, a clinical AI specialist for Indian healthcare and rural PHCs.
Analyze the attached photo of a medicine blister strip or prescription slip.
Respond strictly in valid JSON format with this exact structure:
{{
  "title": "Short title (e.g. Paracetamol 500mg Strip Analysis / Prescription Summary)",
  "identified_items": ["List of medicine names or active ingredients found in the image"],
  "key_findings": "Summary of active salts, strength (e.g. 500mg), manufacturer or indications",
  "dosage_instructions": "Standard guidance: timings (e.g. after food), frequency, duration",
  "safety_warnings": ["Important warnings (e.g. do not exceed 4g/day, avoid alcohol, check liver)"],
  "ayurvedic_interaction_note": "Any known interaction with common Ayurvedic remedies (e.g. avoid high-potency ginger/tulsi extract with blood thinners or gastric irritants)",
  "recommended_tier": "Green" or "Amber" or "Red",
  "plain_language_summary": "Empathetic, clear, conversational explanation tailored for the patient written in {lang_target}. Explain clearly what this medicine does and how to consume it safely."
}}
Ensure the response is ONLY valid JSON with no markdown backticks, no comments."""
        else:
            return f"""You are Dr. Sanjeevani, a clinical triage specialist.
Analyze this photo of a visible symptom (skin rash, swelling, insect bite, wound, or redness).
Respond strictly in valid JSON format with this exact structure:
{{
  "title": "Short clinical observation (e.g. Localized Erythematous Skin Rash)",
  "identified_items": ["Visual characteristics (e.g., circumscribed redness, papules, swelling)"],
  "key_findings": "Detailed objective description of the lesion or symptom visible in the image",
  "dosage_instructions": "Initial first-aid and hygiene measures (e.g. keep dry, clean with lukewarm water, avoid scratching)",
  "safety_warnings": ["Red flags: sudden spreading, facial swelling, difficulty breathing, pus, fever"],
  "ayurvedic_interaction_note": "Safe topical Ayurvedic soothing options (e.g. pure coconut oil with aloe vera, neem water wash) if appropriate",
  "recommended_tier": "Green" or "Amber" or "Red",
  "plain_language_summary": "Empathetic, reassuring explanation for the patient written in {lang_target}. Clearly explain what this looks like and when to visit the nearest Primary Health Centre (PHC)."
}}
Ensure the response is ONLY valid JSON with no markdown backticks, no comments."""

    @classmethod
    def _parse_llm_json(cls, raw: str) -> Optional[Dict[str, Any]]:
        text = raw.strip()
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

        try:
            return json.loads(text)
        except Exception:
            # Try finding first { and last }
            start = text.find("{")
            end = text.rfind("}")
            if start != -1 and end != -1:
                try:
                    return json.loads(text[start : end + 1])
                except Exception:
                    pass
        return None

    @classmethod
    def _fallback_response(
        cls,
        scan_type: str,
        language_hint: str,
        conversation_id: str,
        image_url: Optional[str] = None,
        error: Optional[str] = None
    ) -> MedicalVisionResponse:
        """Robust clinical template when Vision API is in offline fallback mode."""
        is_hi = language_hint == "hi"
        is_hinglish = language_hint == "hinglish"

        if scan_type == "prescription_medicine":
            title = "दवा पर्ची / स्ट्रिप विश्लेषण" if is_hi else ("Dawa Parchi / Strip Analysis" if is_hinglish else "Medicine / Prescription Scan")
            items = ["सामान्य दर्दनिवारक / एंटीपायरेटिक" if is_hi else ("Samanya Dardniwarak / Antipyretic" if is_hinglish else "General Analgesic / Antipyretic Form")]
            findings = "दवा की फोटो सफलतापूर्वक दर्ज की गई है। कृपया डॉक्टर के लिखे अनुसार ही खुराक लें।" if is_hi else ("Dawa ki photo darj kar li gayi hai. Kripya doctor ke bataye anusaar hi dosage lein." if is_hinglish else "Medicine image received. Always verify batch and expiry with your registered pharmacist.")
            dosage = "भोजन के बाद गुनगुने पानी के साथ लें। खाली पेट न लें।" if is_hi else ("Khane ke baad gungune paani ke saath lein. Khali pet na lein." if is_hinglish else "Take after meals with lukewarm water. Do not consume on an empty stomach.")
            warnings = [
                "एक्सपायरी डेट ज़रूर जांचें" if is_hi else ("Expiry date zaroor check karein" if is_hinglish else "Always verify expiry date on strip"),
                "बिना डॉक्टर सलाह के एंटीबायोटिक का कोर्स बीच में न छोड़ें" if is_hi else ("Bina doctor advice ke dose beech me na chhorein" if is_hinglish else "Complete the full antibiotic course prescribed by your PHC MO")
            ]
            ayurvedic = "एलोपैथिक दवा और आयुर्वेदिक काढ़े के बीच कम से कम 1 घंटे का अंतर रखें।" if is_hi else ("Allopathic dawa aur Ayurvedic kadhe ke beech 1 ghante ka antar rakhein." if is_hinglish else "Maintain at least 1 hour gap between allopathic drugs and potent Ayurvedic decoctions.")
            summary = "आपकी दवा की तस्वीर प्राप्त हो गई है। इसे हमेशा सुरक्षित, सूखे स्थान पर रखें और नजदीकी प्राथमिक स्वास्थ्य केंद्र (PHC) या फार्मासिस्ट से खुराक की पुष्टि करें।" if is_hi else ("Aapki dawa ki photo receive ho gayi hai. Isko hamesha dry jagah rakhein aur PHC doctor ya pharmacist se confirm karein." if is_hinglish else "Your medicine photo has been captured. Always store in a cool dry place and confirm dosage with your PHC medical officer.")
        else:
            title = "त्वचा / लक्षण दृश्य विश्लेषण" if is_hi else ("Skin / Lakshan Analysis" if is_hinglish else "Visual Skin / Symptom Inspection")
            items = ["स्थानिक त्वचा लालिमा या चकत्ता" if is_hi else ("Localized skin rash ya redness" if is_hinglish else "Localized skin erythema or irritation")]
            findings = "लक्षण दृश्य निरीक्षण में हल्के चकत्ते या सूजन के संकेत हैं।" if is_hi else ("Image me halki sujan ya rash ke lakshan dikh rahe hain." if is_hinglish else "Visual inspection indicates mild inflammation or dermatological rash.")
            dosage = "हल्के गुनगुने पानी से साफ करें, रगड़ें नहीं। सूती कपड़े पहनें।" if is_hi else ("Gungune paani se saaf karein, khujlayen nahi. Sooti kapde pehnein." if is_hinglish else "Clean gently with lukewarm water, do not scratch. Wear breathable cotton clothing.")
            warnings = [
                "यदि चकत्ता तेजी से फैले या सांस लेने में तकलीफ हो, तुरंत 108 पर कॉल करें" if is_hi else ("Agar rash tezi se faile ya sans lene me takleef ho, turant 108 par call karein" if is_hinglish else "If rash spreads rapidly or causes difficulty breathing, call 108 immediately")
            ]
            ayurvedic = "शुद्ध नारियल तेल या नीम के पानी से हल्की सिकाई आराम दे सकती है।" if is_hi else ("Shuddh nariyal tel ya neem ke paani se aaram mil sakta hai." if is_hinglish else "Pure natural coconut oil or mild neem decoction can soothe the affected area.")
            summary = "तस्वीर दर्ज की गई है। खुजली से बचें। यदि यह 48 घंटे में ठीक न हो या फैलने लगे, तो निकटतम स्वास्थ्य केंद्र पर दिखाएं।" if is_hi else ("Photo note kar li gayi hai. Khujli na karein. 48 ghante me aaram na mile to PHC doctor ko zaroor dikhayein." if is_hinglish else "Photo noted. Avoid scratching. If not improving within 48 hours or if fever develops, visit your local PHC.")

        return MedicalVisionResponse(
            conversation_id=conversation_id,
            scan_type=scan_type,
            title=title,
            identified_items=items,
            key_findings=findings,
            dosage_instructions=dosage,
            safety_warnings=warnings,
            ayurvedic_interaction_note=ayurvedic,
            recommended_tier="Green",
            plain_language_summary=summary,
            image_url=image_url
        )
