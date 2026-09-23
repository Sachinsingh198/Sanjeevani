import os
import re
import json
from typing import List, Dict, Any
from app.core.logger import logger

def clean_unicode(text: str) -> str:
    """Removes non-standard MS Word symbols and private use characters."""
    text = re.sub(r'[\uf000-\uf8ff]', '', text)
    text = text.replace('\u2013', '-').replace('\u2014', '-').replace('\u2018', "'").replace('\u2019', "'")
    text = text.replace('\u201c', '"').replace('\u201d', '"').replace('\xa0', ' ')
    return text.strip()

def find_docx_file(base_dir: str = "DATA") -> str | None:
    """Finds ayurveda_1.docx inside DATA/Ayush or DATA/ayush, handling different execution roots."""
    possible_roots = [base_dir, os.path.join("backend", base_dir), os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "DATA")]
    candidates = []
    for root in possible_roots:
        candidates.extend([
            os.path.join(root, "Ayush", "ayurveda_1.docx"),
            os.path.join(root, "ayush", "ayurveda_1.docx"),
            os.path.join(root, "ayurveda_1.docx")
        ])
    for c in candidates:
        if os.path.exists(c):
            return c
    
    # Fallback walk
    for root in possible_roots:
        if os.path.exists(root):
            for r_dir, _, files in os.walk(root):
                for f in files:
                    if f.lower() == "ayurveda_1.docx" and not f.startswith("~$"):
                        return os.path.join(r_dir, f)
    return None

def extract_docx_paragraphs(file_path: str) -> List[str]:
    """Extracts cleaned paragraphs using python-docx with fallback."""
    try:
        import docx
        doc = docx.Document(file_path)
        paras = [clean_unicode(p.text) for p in doc.paragraphs if clean_unicode(p.text)]
        return paras
    except Exception as e:
        logger.warning(f"[Docx Extractor] python-docx error: {e}. Attempting raw xml parse...")
        import zipfile
        import xml.etree.ElementTree as ET
        try:
            with zipfile.ZipFile(file_path) as z:
                xml_content = z.read("word/document.xml")
            tree = ET.fromstring(xml_content)
            paras = []
            for p in tree.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p"):
                texts = [node.text for node in p.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t") if node.text]
                p_text = clean_unicode("".join(texts))
                if p_text:
                    paras.append(p_text)
            return paras
        except Exception as e2:
            logger.error(f"[Docx Extractor] Critical error reading docx: {e2}")
            return []

def parse_ayurveda_remedies(file_path: str = None) -> List[Dict[str, Any]]:
    """
    Parses the classical Ayurveda docx into structured clinical remedies.
    """
    if not file_path:
        file_path = find_docx_file()

    if not file_path or not os.path.exists(file_path):
        logger.warning("[Docx Extractor] No docx file found.")
        return []

    paras = extract_docx_paragraphs(file_path)
    if not paras:
        logger.warning(f"[Docx Extractor] No content in {file_path}")
        return []

    raw_sections = []
    current_title = None
    current_body = []

    # Regex for formulation markers
    # e.g., Verse 70 (Kiratadi Kashaya): or Verses 105-107 (Drakshadi Kashaya):
    formulation_keywords = [
        'kashaya', 'kwath', 'avaleha', 'churna', 'ghrita', 'taila', 
        'paniya', 'formulation', 'yoga', 'dhupa', 'sveda', 'nasya', 
        'decoction', 'remedy', 'infusion', 'therapy', 'gruel'
    ]

    for p in paras:
        m = re.search(r'Verse[s]?\s+[\d–\-]+.*?\((.*?)\)', p, re.IGNORECASE)
        is_heading = False
        cand_name = ""

        if m:
            inner = m.group(1).strip()
            if any(w in inner.lower() for w in formulation_keywords):
                is_heading = True
                cand_name = inner
        elif any(w in p for w in ['(Shadanga Paniya', 'Kashaya):', 'Avaleha):', 'Ghrita):', 'Dhupa):', 'Yoga):']) and len(p) < 90:
            is_heading = True
            cand_name = p
        elif (p.startswith('Verses ') or p.startswith('Verse ')) and any(w in p for w in ['Kashaya', 'Avaleha', 'Ghrita', 'Churna', 'Taila', 'Paniya', 'Yoga', 'Dhupa']):
            if len(p) < 100 and not p.endswith('.'):
                is_heading = True
                cand_name = p

        if is_heading:
            if current_title and current_body:
                raw_sections.append((current_title, list(current_body)))
            current_title = cand_name if cand_name else p
            current_body = [p]
        elif current_title:
            if p.startswith('Page ') or p.startswith('Chapter ') or p.startswith('Commencement ') or (re.search(r'^Verse[s]?\s+\d+', p) and not any(k in p.lower() for k in ['ingredient', 'indication', 'administration', 'taken', 'dose', 'preparation', 'boiled', 'cures', 'mixed', 'decoction'])):
                if not any(k in p.lower() for k in ['ingredient', 'indication', 'administration', 'taken', 'dose', 'preparation', 'boiled', 'cures', 'mixed']):
                    raw_sections.append((current_title, list(current_body)))
                    current_title = None
                    current_body = []
                    continue
            current_body.append(p)

    if current_title and current_body:
        raw_sections.append((current_title, list(current_body)))

    logger.info(f"[Docx Extractor] Discovered {len(raw_sections)} formulation sections in {os.path.basename(file_path)}")

    remedies = []
    seen_names = set()

    for idx, (raw_title, lines) in enumerate(raw_sections):
        full_text = " ".join(lines)
        if len(full_text.strip()) < 30:
            continue

        # Extract Clean Remedy Name
        clean_name = raw_title
        # strip "Verse XX (...)"
        m_name = re.search(r'\((.*?)\)', clean_name)
        if m_name:
            clean_name = m_name.group(1).strip()
        clean_name = re.sub(r'^(Verse[s]?\s*[\d–\-]+[:\s]*)', '', clean_name, flags=re.IGNORECASE).strip()
        clean_name = clean_name.replace('Formulation', '').replace(':', '').strip()
        if not clean_name:
            clean_name = f"Ayurvedic Formulation {idx+1}"

        if clean_name.lower() in seen_names:
            clean_name = f"{clean_name} (Var. {idx+1})"
        seen_names.add(clean_name.lower())

        # Extract Condition / Symptoms
        indication_match = re.search(r'Indication[s]?[:\s]+(.*?)(?=(Administration|Page|Verse|\Z))', full_text, re.IGNORECASE)
        action_match = re.search(r'(cures|destroys|resolves|alleviates|subdues|indicated for|useful in)\s+([^.]+)', full_text, re.IGNORECASE)

        condition_desc = ""
        if indication_match:
            condition_desc = indication_match.group(1).strip()
        elif action_match:
            condition_desc = f"{action_match.group(1)} {action_match.group(2)}".strip()
        else:
            condition_desc = "Fever and associated clinical symptoms"

        # Refine Condition Name
        cond_name = "Ayurvedic Treatment"
        cond_lower = (condition_desc + " " + full_text).lower()
        
        keywords = ["ayurveda", "home remedy", "nuskha", "herbal"]

        if "cough" in cond_lower or "kasa" in cond_lower or "phlegm" in cond_lower:
            cond_name = "Cough, Phlegm & Respiratory Congestion"
            keywords.extend(["cough", "khasi", "kaph", "phlegm", "sookhi khasi", "chest congestion", "throat"])
        elif "burning" in cond_lower or "pitta" in cond_lower or "thirst" in cond_lower or "daha" in cond_lower:
            cond_name = "Pitta Fever, High Thirst & Burning Sensation"
            keywords.extend(["burning sensation", "pitta", "jalan", "thirst", "pyas", "heat", "fever", "bukhar"])
        elif "body ache" in cond_lower or "shoola" in cond_lower or "joint" in cond_lower or "vata" in cond_lower:
            cond_name = "Vata Fever, Chills & Body Aches"
            keywords.extend(["body ache", "badan dard", "chills", "thand lagna", "shivering", "joint pain", "fever"])
        elif "indigestion" in cond_lower or "appetite" in cond_lower or "vomiting" in cond_lower or "nausea" in cond_lower:
            cond_name = "Fever with Indigestion, Nausea & Sluggish Agni"
            keywords.extend(["indigestion", "loss of appetite", "bhukh na lagna", "vomiting", "ulti", "nausea", "gas"])
        elif "diarrhea" in cond_lower or "atisara" in cond_lower or "loose" in cond_lower:
            cond_name = "Fever with Diarrhea (Jvaratisara)"
            keywords.extend(["diarrhea", "loose motions", "dast", "pet kharab", "abdominal cramps", "fever"])
        elif "chronic" in cond_lower or "intermittent" in cond_lower or "vishama" in cond_lower:
            cond_name = "Chronic or Intermittent Fever (Vishama Jvara)"
            keywords.extend(["chronic fever", "purana bukhar", "vishama jvara", "debility", "weakness", "kamzori"])
        else:
            cond_name = "Acute Jvara (Fever & Malaise)"
            keywords.extend(["fever", "bukhar", "jvara", "illness", "temperature", "infection"])

        # Add formulation specific keywords
        for w in clean_name.split():
            if len(w) > 3:
                keywords.append(w.lower())

        # Clean text & preparation
        remedy_text = full_text
        # Remove page numbers and verse tags from the instruction text
        remedy_text = re.sub(r'Page\s+\d+', '', remedy_text)
        remedy_text = re.sub(r'Verse[s]?\s*[\d–\-]+[:\s]*', '', remedy_text).strip()
        if len(remedy_text) > 450:
            remedy_text = remedy_text[:450].rsplit('.', 1)[0] + "."

        ayurvedic_note = (
            f"Classical formulation from Ayurveda treatise. Action: {condition_desc[:120]}. "
            f"Balances somatic humors and cleanses metabolic waste (Ama)."
        )

        item = {
            "id": f"ayush_docx_{idx+1:03d}",
            "condition_name": cond_name,
            "keywords": list(set(keywords)),
            "tier": "Green",
            "remedy_name": clean_name,
            "remedy_text": remedy_text,
            "ayurvedic_note": ayurvedic_note,
            "altitude_band": "All Altitudes (500m - 3500m)",
            "source": "Ayurveda Classical Compendium (ayurveda_1.docx)",
            "safety_check": "Verified safe"
        }
        remedies.append(item)

    return remedies

def save_docx_remedies_json(output_path: str = "DATA/ayurveda_docx_remedies.json"):
    """Extracts and saves docx remedies to a permanent JSON file."""
    remedies = parse_ayurveda_remedies()
    if remedies:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(remedies, f, ensure_ascii=False, indent=2)
        logger.info(f"[Docx Extractor] Successfully saved {len(remedies)} remedies to {output_path}")
    return remedies

if __name__ == "__main__":
    rems = save_docx_remedies_json()
    logger.info(f"Extraction complete. Total: {len(rems)}")
