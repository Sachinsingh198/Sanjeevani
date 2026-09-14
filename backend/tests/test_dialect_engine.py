import pytest
import asyncio
from app.core.bhashini_engine import BhashiniVoiceEngine
from app.core.tts_engine import IndicTTSEngine

@pytest.fixture
def engine():
    return BhashiniVoiceEngine(lexicon_path="DATA/garhwali_lexicon.json")

def test_garhwali_throat_translation(engine):
    """'Gale ma bhyo' must be translated to 'gale me dard aur kharash'."""
    raw_input = "Mujhe subah se gale ma bhyo lagyun hai."
    normalized = engine.normalize_dialect(raw_input)
    assert "gale me dard aur kharash" in normalized.lower()

def test_garhwali_headache_translation(engine):
    """'Mund peed' must translate to 'sar dard'."""
    raw_input = "Do din se mund peed ho raha hai."
    normalized = engine.normalize_dialect(raw_input)
    assert "sar dard" in normalized.lower()

def test_tts_payload_cleaner(engine):
    """Markdown asterisks and bold tags must be stripped before speech synthesis."""
    markdown_text = "Aapke liye **Tulsi-Mulethi** ka *kwath* labhkari hai."
    payload = engine.format_tts_payload(markdown_text)
    assert "**" not in payload["clean_text"]
    assert "*" not in payload["clean_text"]
    assert "Tulsi-Mulethi" in payload["clean_text"]

def test_auto_detect_garhwali_roman(engine):
    """Detects Garhwali language in Roman script."""
    text1 = "Miku mund ma bhyo ho rahyu chha"
    assert engine.detect_language(text1) == "garhwali"

    text2 = "Dainu bhula, kani chha?"
    assert engine.detect_language(text2) == "garhwali"

def test_auto_detect_garhwali_devanagari(engine):
    """Detects Garhwali language in Devanagari script."""
    text1 = "दैणु भूला, कनि छा?"
    assert engine.detect_language(text1) == "garhwali"

    text2 = "मि कु मुंड पीड होंदू छ"
    assert engine.detect_language(text2) == "garhwali"

def test_auto_detect_english(engine):
    """Detects English language."""
    text = "Hello doctor, I have a cough and cold since yesterday"
    assert engine.detect_language(text) == "english"

def test_auto_detect_hindi(engine):
    """Detects standard Hindi / Hinglish."""
    text = "Namaste doctor, mujhe do din se sar dard hai"
    assert engine.detect_language(text) == "hindi"

@pytest.mark.asyncio
async def test_indic_tts_synthesis():
    """Synthesizes speech using the Indic TTS engine and verifies MP3 stream."""
    tts = IndicTTSEngine()
    audio_bytes, media_type = await tts.synthesize("Namaste! Main Sanjeevani hoon.", language="hi")
    assert media_type == "audio/mpeg"
    assert len(audio_bytes) > 500  # Valid MP3 audio data