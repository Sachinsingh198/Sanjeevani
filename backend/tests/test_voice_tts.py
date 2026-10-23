import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_tts_health_reports_status():
    res = client.get("/voice/tts/health")
    assert res.status_code == 200
    body = res.json()
    assert body["provider"] in ("sarvam", "bhashini", "neural", "neural_indic")
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


def test_tts_honors_explicit_provider_model_and_speaker():
    fake_audio = b"CUSTOM_SARVAM_AUDIO_BYTES"
    mock_synth = AsyncMock(return_value=(fake_audio, "audio/wav"))
    with patch("app.api.voice._indic_tts_engine.synthesize", new=mock_synth):
        res = client.post(
            "/voice/tts",
            json={
                "text": "Namaste, aap kaise hain?",
                "language": "hi",
                "gender": "female",
                "provider": "sarvam",
                "model": "bulbul:v3",
                "speaker": "shreya",
            },
        )
        assert res.status_code == 200
        assert mock_synth.called
        call_kwargs = mock_synth.call_args.kwargs
        assert call_kwargs.get("provider") == "sarvam"
        assert call_kwargs.get("model") == "bulbul:v3"
        assert call_kwargs.get("speaker") == "shreya"


def test_tts_stream_honors_explicit_provider_model_and_speaker():
    async def fake_stream(*args, **kwargs):
        assert kwargs.get("provider") == "sarvam"
        assert kwargs.get("model") == "bulbul:v3"
        assert kwargs.get("speaker") == "shreya"
        yield b"CHUNK_1"
        yield b"CHUNK_2"

    with patch("app.api.voice._indic_tts_engine.synthesize_stream", side_effect=fake_stream):
        res = client.post(
            "/voice/tts/stream",
            json={
                "text": "Streaming test for audio model selection",
                "language": "hi",
                "gender": "female",
                "provider": "sarvam",
                "model": "bulbul:v3",
                "speaker": "shreya",
            },
        )
        assert res.status_code == 200
        assert res.headers["content-type"].startswith("audio/mpeg")
        assert res.content == b"CHUNK_1CHUNK_2"