import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_tts_health_reports_status():
    res = client.get("/voice/tts/health")
    assert res.status_code == 200
    body = res.json()
    assert body["provider"] in ("sarvam", "neural")
    assert body["status"] == "ready"


def test_tts_sarvam_success_mocked():
    fake_audio = b"FAKE_SARVAM_AUDIO_BYTES"
    with patch.object(
        app.state if hasattr(app, "state") else app,
        "dummy",
        create=True
    ):
        with patch("app.api.voice._indic_tts_engine.synthesize", new=AsyncMock(return_value=(fake_audio, "audio/wav"))):
            res = client.post(
                "/voice/tts",
                json={"text": "Namaste, aapko kya takleef hai?", "language": "hi"}
            )
            assert res.status_code == 200
            body = res.json()
            assert body["format"] == "wav"
            assert len(body["audio_base64"]) > 0


def test_tts_returns_503_when_all_fail():
    with patch("app.api.voice._indic_tts_engine.synthesize", new=AsyncMock(side_effect=Exception("TTS Failure"))):
        res = client.post("/voice/tts", json={"text": "Namaste", "language": "hi"})
        assert res.status_code == 503
        assert "both failed" in res.json()["detail"].lower()