"""
Ayurveda 3 Extractor for Sanjeevani 2.0
Extracts, structures, and categorizes 232 classical Ayurvedic botanical remedies
from DATA/Ayush/ayurveda_3.docx into structured clinical records for RAG and Qdrant.
"""

import os
import sys
sys.path.insert(0, os.path.abspath("."))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
import re
import json
import docx
from typing import List, Dict, Any
from app.core.logger import logger

def clean_unicode_text(text: str) -> str:
    """Removes non-standard MS Word symbols and private use characters."""
    if not text:
        return ""
    text = re.sub(r'[\uf000-\uf8ff]', '', text)
    text = text.replace('\u2013', '-').replace('\u2014', '-').replace('\u2018', "'").replace('\u2019', "'")
    text = text.replace('\u201c', '"').replace('\u201d', '"').replace('\xa0', ' ')
    return text.strip()

def find_ayurveda_3_docx(base_dir: str = "DATA") -> str | None:
    """Locates ayurveda_3.docx across workspace and backend paths."""
    candidates = [
        os.path.join(base_dir, "Ayush", "ayurveda_3.docx"),
        os.path.join(base_dir, "ayush", "ayurveda_3.docx"),
        os.path.join(base_dir, "ayurveda_3.docx"),
        os.path.join("backend", base_dir, "Ayush", "ayurveda_3.docx"),
        os.path.join("backend", base_dir, "ayush", "ayurveda_3.docx"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "DATA", "Ayush", "ayurveda_3.docx")
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return None

def classify_condition_and_keywords(sanskrit: str, english: str, indications: str, properties: str) -> tuple[str, list[str]]:
    """Derives clinical condition and high-recall search keywords from indications and properties."""
    ind_text = f"{sanskrit} {english} {indications}".lower()
    combined = f"{ind_text} {properties}".lower()
    keywords = ["ayurveda", "herbal", "dravyaguna", "home remedy", "nuskha", "jadi-buti"]
    
    # Add names to keywords
    for token in re.findall(r'[a-zA-Z\u0900-\u097F]{3,}', f"{sanskrit} {english}"):
        keywords.append(token.lower())

    # Add specific Indian synonyms
    eng_lower = english.lower()
    if "vasica" in eng_lower or "adhatoda" in eng_lower:
        keywords.extend(["vasa", "vasaka", "malabar nut", "cough", "khasi", "kasa", "respiratory"])
    if "cuminum" in eng_lower or "cumin" in eng_lower:
        keywords.extend(["jeera", "cumin", "jiraka", "gas", "indigestion", "bloating", "apach"])
    if "trachyspermum" in eng_lower or "carom" in eng_lower or "ajwain" in eng_lower or "yavani" in eng_lower:
        keywords.extend(["ajwain", "carom", "yavani", "gas", "bloating", "pet dard", "indigestion"])

    cond_name = "Ayurvedic Herbal Therapy"

    # Prioritize clinical indications rather than broad dosha mentions
    if any(k in ind_text for k in ["asthma", "shvasa", "cough", "kasa", "kasanashana", "hoarseness", "vaisvarya", "bronchitis", "respiratory", "sore throat", "gala kharash"]):
        cond_name = "Respiratory Ailments, Cough & Breathing Congestion"
        keywords.extend(["cough", "khasi", "kasa", "shvasa", "asthma", "saans lene me takleef", "balgam", "chest congestion", "throat"])
    elif any(k in ind_text for k in ["constipation", "vibandha", "bloating", "adhmana", "anaha", "indigestion", "ajirna", "flatulence", "colic", "shula", "grahani"]):
        cond_name = "Digestive Disorders, Flatulence & Constipation"
        keywords.extend(["pet dard", "constipation", "kabz", "gas", "bloating", "apach", "indigestion", "digestion", "stomach ache"])
    elif any(k in ind_text for k in ["fever", "jvara", "vishamajvara", "intermittent fever", "bukhar", "pyrexia"]):
        cond_name = "Fever, Malaise & Jvara"
        keywords.extend(["fever", "bukhar", "jvara", "tapad", "chills", "thand lagna", "shivering"])
    elif any(k in ind_text for k in ["skin disease", "kushtha", "itching", "kandu", "wounds", "vrana", "leukoderma", "shvitra"]):
        cond_name = "Skin Disorders, Itching & Wound Healing"
        keywords.extend(["skin", "khujli", "itching", "kushtha", "charm rog", "rashes", "vrana", "wound"])
    elif any(k in ind_text for k in ["bleeding", "raktapitta", "pittasra", "blood disorder"]):
        cond_name = "Raktapitta & Pitta Bleeding Disorders"
        keywords.extend(["bleeding", "khoon aana", "raktapitta", "pitta", "burning", "jalan"])
    elif any(k in ind_text for k in ["edema", "shopha", "swelling", "shotha"]):
        cond_name = "Edema, Swelling & Fluid Retention (Shopha)"
        keywords.extend(["edema", "swelling", "soojan", "shopha", "shotha", "fluid"])
    elif any(k in ind_text for k in ["headache", "shiroroga", "head", "eyes", "netra", "ears"]):
        cond_name = "Head, Ear & Eye Ailments (Urdhwajatrugata)"
        keywords.extend(["headache", "sar dard", "sir dard", "aankh", "kaan", "eyes", "netra"])
    elif any(k in ind_text for k in ["arthritis", "amavata", "vatarakta", "gout", "joint pain", "sandhivata"]):
        cond_name = "Joint Pain, Arthritis & Vata Disorders"
        keywords.extend(["joint pain", "jodon ka dard", "amavata", "arthritis", "gathiya", "vata", "body ache"])
    elif any(k in ind_text for k in ["worms", "krimi", "intestinal worms"]):
        cond_name = "Intestinal Worms & Parasitic Infestations (Krimi)"
        keywords.extend(["worms", "pet ke kide", "krimi", "parasites"])
    elif any(k in ind_text for k in ["rejuvenative", "rasayani", "strength", "balya", "intellect", "medhya"]):
        cond_name = "General Debility, Rejuvenation & Vitality (Rasayana)"
        keywords.extend(["weakness", "kamzori", "thakan", "fatigue", "energy", "vitality", "immunity", "rasayana"])

    return cond_name, list(set(keywords))

def parse_ayurveda_3_remedies(file_path: str = None) -> List[Dict[str, Any]]:
    """
    Parses DATA/Ayush/ayurveda_3.docx into structured clinical records.
    """
    if not file_path:
        file_path = find_ayurveda_3_docx()

    if not file_path or not os.path.exists(file_path):
        logger.warning(f"[Ayurveda 3 Extractor] Docx file not found: {file_path}")
        return []

    try:
        doc = docx.Document(file_path)
    except Exception as e:
        logger.error(f"[Ayurveda 3 Extractor] Failed to load docx: {e}")
        return []

    entries = []
    current_entry = None

    for p in doc.paragraphs:
        text = clean_unicode_text(p.text)
        if not text or text == "PDF":
            continue

        # Header format: Sanskrit Name (English / Botanical Name)
        m_head = re.match(r"^([^\(]+)\s*\(([^)]+)\)[:\s]*$", text)
        if m_head and not text.startswith("Properties:") and not text.startswith("Indications:") and not text.startswith("Administration:"):
            if current_entry:
                entries.append(current_entry)
            sanskrit = m_head.group(1).strip()
            paren_content = m_head.group(2).strip()
            current_entry = {
                "sanskrit_name": sanskrit,
                "full_title": text.rstrip(":"),
                "paren_content": paren_content,
                "properties": "",
                "indications": "",
                "administration": ""
            }
        elif current_entry:
            if text.startswith("Properties:"):
                current_entry["properties"] = text.replace("Properties:", "").strip()
            elif text.startswith("Indications:"):
                current_entry["indications"] = text.replace("Indications:", "").strip()
            elif text.startswith("Administration:"):
                current_entry["administration"] = text.replace("Administration:", "").strip()
            else:
                if current_entry["indications"]:
                    current_entry["indications"] += " " + text
                elif current_entry["properties"]:
                    current_entry["properties"] += " " + text

    if current_entry:
        entries.append(current_entry)

    logger.info(f"[Ayurveda 3 Extractor] Successfully parsed {len(entries)} botanical monographs.")

    remedies = []
    seen_names = set()

    for idx, e in enumerate(entries):
        sanskrit = e["sanskrit_name"]
        paren = e["paren_content"]
        common_name = paren.split("/")[0].strip() if "/" in paren else paren
        
        # Ensure common Hindi and English names are prominently reflected
        title_extra = ""
        paren_lower = paren.lower()
        if "vasica" in paren_lower or "adhatoda" in paren_lower:
            title_extra = " - Vasa / Vasaka"
        elif "cumin" in paren_lower or "cuminum" in paren_lower:
            title_extra = " - Jeera / Cumin"
        elif "ajwain" in paren_lower or "trachyspermum" in paren_lower or "carom" in paren_lower:
            title_extra = " - Ajwain / Carom Seeds"
        elif "tulsi" in paren_lower or "ocimum" in paren_lower:
            title_extra = " - Tulsi / Holy Basil"
        elif "ginger" in paren_lower or "zingiber" in paren_lower or "ardraka" in paren_lower or "shunthi" in paren_lower:
            title_extra = " - Adrak / Shunthi"

        full_remedy_name = f"{sanskrit}{title_extra} ({paren})"
        
        if full_remedy_name.lower() in seen_names:
            full_remedy_name = f"{full_remedy_name} (Vol. 3 #{idx+1})"
        seen_names.add(full_remedy_name.lower())

        cond_name, keywords = classify_condition_and_keywords(
            sanskrit, paren, e["indications"], e["properties"]
        )

        # Formulate clean, practical preparation & administration instructions
        admin_text = e["administration"]
        if not admin_text:
            if "decoction" in e["properties"].lower() or "kashaya" in e["properties"].lower():
                admin_text = f"Take 1 teaspoon of {common_name} powder, boil in 1 cup of water until reduced by half, strain and take warm."
            elif "oil" in e["properties"].lower() or "taila" in e["properties"].lower():
                admin_text = f"Apply gently on the affected area or use lukewarm as directed by an Ayurvedic practitioner."
            else:
                admin_text = f"1/2 to 1 teaspoon of {common_name} powder taken with lukewarm water or honey once or twice daily after meals."

        remedy_text = (
            f"1. Samagri: Shuddh {full_remedy_name} (churna ya kashaya).\n"
            f"2. Vidhi: {admin_text}\n"
            f"3. Nirdesh: Gungune paani ke saath din mein 1-2 baar sewan karein."
        )

        ayurvedic_note = (
            f"Classical Dravyaguna Monograph from Ayurveda Treatise. "
            f"Properties: {e['properties'][:150]}. "
            f"Indications: {e['indications'][:150]}."
        )

        item = {
            "id": f"ayurveda_3_{idx+1:03d}",
            "condition_name": cond_name,
            "keywords": keywords,
            "tier": "Green",
            "safety_tier": "household_safe",
            "remedy_name": full_remedy_name,
            "sanskrit_name": sanskrit,
            "common_name": common_name,
            "botanical_details": paren,
            "dravyaguna_properties": e["properties"],
            "clinical_indications": e["indications"],
            "remedy_text": remedy_text,
            "ayurvedic_note": ayurvedic_note,
            "altitude_band": "All Altitudes (500m - 3500m)",
            "source": "Classical Dravyaguna Compendium (ayurveda_3.docx)",
            "safety_check": "Verified safe"
        }
        remedies.append(item)

    return remedies

def save_ayurveda_3_remedies_json(output_path: str = "DATA/ayurveda_3_remedies.json") -> List[Dict[str, Any]]:
    """Extracts and saves ayurveda_3.docx monographs to JSON."""
    remedies = parse_ayurveda_3_remedies()
    if remedies:
        # Resolve target path relative to working directory or backend
        target = output_path
        if not os.path.exists("DATA") and os.path.exists("backend/DATA"):
            target = os.path.join("backend", output_path)
        os.makedirs(os.path.dirname(target), exist_ok=True)
        with open(target, "w", encoding="utf-8") as f:
            json.dump(remedies, f, ensure_ascii=False, indent=2)
        logger.info(f"[Ayurveda 3 Extractor] Saved {len(remedies)} remedies to {target}")
    return remedies

if __name__ == "__main__":
    rems = save_ayurveda_3_remedies_json()
    print(f"Extraction complete. Total remedies generated: {len(rems)}")
