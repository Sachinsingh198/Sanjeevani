import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_tts_health_reports_status():
    res = client.get("/voice/tts/health")
    assert res.status_code == 200
    body = res.json()
    assert body["provider"] in ("ai4bharat", "sarvam", "neural")
    assert body["status"] in ("not_loaded", "loading", "ready", "failed")


def test_tts_returns_503_when_model_not_ready():
    with patch("app.api.voice.settings.TTS_PROVIDER", "ai4bharat"):
        with patch("app.api.voice.ai4bharat_tts_engine.status", {"status": "loading", "device": "cpu", "error": None}):
            with patch(
                "app.api.voice.ai4bharat_tts_engine.synthesize",
                new=AsyncMock(side_effect=__import__("app.core.ai4bharat_tts", fromlist=["TTSNotReadyError"]).TTSNotReadyError("loading")),
            ):
                with patch("app.api.voice._indic_tts_engine.synthesize", new=AsyncMock(side_effect=Exception("Fallback failed"))):
                    res = client.post("/voice/tts", json={"text": "Namaste", "language": "hi"})
                    assert res.status_code == 503


def test_tts_success_path_mocked():
    fake_result = {"audio_base64": "ZmFrZWF1ZGlv", "format": "wav", "language": "hi"}
    with patch("app.api.voice.settings.TTS_PROVIDER", "ai4bharat"):
        with patch("app.api.voice.ai4bharat_tts_engine.status", {"status": "ready", "device": "cpu", "error": None}):
            with patch(
                "app.api.voice.ai4bharat_tts_engine.synthesize",
                new=AsyncMock(return_value=fake_result),
            ):
                res = client.post(
                    "/voice/tts",
                    json={"text": "Aapko kya takleef ho rahi hai?", "language": "hi"},
                )
                assert res.status_code == 200
                body = res.json()
                assert body["audio_base64"] == "ZmFrZWF1ZGlv"
                assert body["provider"] == "ai4bharat"