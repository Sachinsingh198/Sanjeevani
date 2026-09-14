import pytest
from app.core.bhashini_engine import BhashiniVoiceEngine

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