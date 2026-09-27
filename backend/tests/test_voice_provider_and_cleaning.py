import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.core.bhashini_engine import clean_text_for_speech
from app.core.tts_engine import IndicTTSEngine, get_shared_tts_engine

client = TestClient(app)


def test_clean_text_for_speech_eliminates_factorial():
    """Verify that exclamation marks '!' are replaced with period and space to avoid Bhashini 'factorial' pronunciation."""
    input_text = "नमस्ते! आपका स्वागत है! यह बहुत बढ़िया है!"
    cleaned = clean_text_for_speech(input_text, language="hi")
    assert "!" not in cleaned
    assert "factorial" not in cleaned.lower()
    assert "नमस्ते." in cleaned or "नमस्ते ." in cleaned


def test_clean_text_for_speech_handles_ranges_and_percentages():
    """Verify range numbers and percentages are translated to spoken Hindi equivalents."""
    input_text = "बुखार 7-10 दिन से है और ऑक्सीजन 95% है।"
    cleaned = clean_text_for_speech(input_text, language="hi")
    assert "se" in cleaned
    assert "प्रतिशत" in cleaned
    assert "%" not in cleaned


def test_clean_text_for_speech_removes_emojis_and_markdown():
    """Verify emojis, hashtags, and asterisks are stripped."""
    input_text = "🌿 **Sanjeevani Mitra** #108 🩺 Call 108 immediately!"
    cleaned = clean_text_for_speech(input_text, language="hi")
    assert "🌿" not in cleaned
    assert "🩺" not in cleaned
    assert "**" not in cleaned
    assert "#" not in cleaned
    assert "!" not in cleaned


def test_get_voice_provider_status():
    """Verify GET /voice/provider returns primary, fallback, and status."""
    res = client.get("/voice/provider")
    assert res.status_code == 200
    data = res.json()
    assert "primary" in data
    assert "fallback" in data
    assert "offline_fallback" in data
    assert data["primary"] in ("bhashini", "sarvam")
    assert data["fallback"] in ("bhashini", "sarvam")
    assert data["primary"] != data["fallback"]
    assert data["offline_fallback"] == "neural_indic"


def test_post_voice_provider_switch_to_sarvam():
    """Switching primary to Sarvam sets Bhashini as automatic fallback."""
    res = client.post("/voice/provider", json={"provider": "sarvam"})
    assert res.status_code == 200
    data = res.json()
    assert data["primary"] == "sarvam"
    assert data["fallback"] == "bhashini"


def test_post_voice_provider_switch_to_bhashini():
    """Switching primary to Bhashini sets Sarvam as automatic fallback."""
    res = client.post("/voice/provider", json={"provider": "bhashini"})
    assert res.status_code == 200
    data = res.json()
    assert data["primary"] == "bhashini"
    assert data["fallback"] == "sarvam"


def test_post_voice_provider_invalid():
    """Invalid provider returns 400 Bad Request."""
    res = client.post("/voice/provider", json={"provider": "google_translate"})
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_symmetrical_failover_bhashini_to_sarvam():
    """When Bhashini fails, synthesize seamlessly falls back to Sarvam."""
    from app.config import settings
    engine = IndicTTSEngine()
    engine.set_primary_provider("bhashini")
    assert engine.get_primary_provider() == "bhashini"

    fake_sarvam_audio = b"FAKE_FALLBACK_AUDIO_DATA"
    with patch.object(settings, "SARVAM_API_KEY", "mock-sarvam-key"):
        with patch.object(engine, "_synthesize_bhashini", new=AsyncMock(side_effect=Exception("Bhashini 500 API timeout"))):
            with patch.object(engine, "_synthesize_sarvam", new=AsyncMock(return_value=(fake_sarvam_audio, "audio/wav"))):
                audio, ctype = await engine.synthesize("Namaste parikshan", language="hi")
                assert audio == fake_sarvam_audio
                assert engine.last_provider == "sarvam"


@pytest.mark.asyncio
async def test_symmetrical_failover_sarvam_to_bhashini():
    """When Sarvam fails, synthesize seamlessly falls back to Bhashini."""
    from app.core.bhashini_client import bhashini_client
    engine = IndicTTSEngine()
    engine.set_primary_provider("sarvam")
    assert engine.get_primary_provider() == "sarvam"

    fake_bhashini_audio = b"FAKE_BHASHINI_FALLBACK_DATA"
    from unittest.mock import PropertyMock
    with patch("app.core.bhashini_client.BhashiniClient.is_configured", new_callable=PropertyMock, return_value=True):
        with patch.object(engine, "_synthesize_sarvam", new=AsyncMock(side_effect=Exception("Sarvam rate limit 429"))):
            with patch.object(engine, "_synthesize_bhashini", new=AsyncMock(return_value=(fake_bhashini_audio, "audio/wav"))):
                audio, ctype = await engine.synthesize("Namaste parikshan", language="hi")
                assert audio == fake_bhashini_audio
                assert engine.last_provider == "bhashini"
