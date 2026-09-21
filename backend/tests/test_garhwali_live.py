import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_chat_garhwali_auto_detection():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Garhwali input
        res = await client.post("/chat/message", json={
            "conversation_id": "test-live-garhwali-1",
            "message": "Dainu bhula, miku gale ma bhyo ho rahyu chha",
            "language_hint": "auto"
        })
        assert res.status_code == 200
        data = res.json()
        assert data["detected_language"] == "garhwali"
        assert len(data["reply_text"]) > 0

@pytest.mark.asyncio
async def test_chat_english_auto_detection():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 2. English input
        res = await client.post("/chat/message", json={
            "conversation_id": "test-live-english-1",
            "message": "Hello doctor, I have had a severe dry cough since yesterday",
            "language_hint": "auto"
        })
        assert res.status_code == 200
        data = res.json()
        assert data["detected_language"] == "english"
        assert len(data["reply_text"]) > 0

@pytest.mark.asyncio
async def test_tts_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/chat/tts", json={
            "text": "Dainu bhula! Main Sanjeevani chhon. Twari poori baat suni li.",
            "language": "garhwali",
            "gender": "female"
        })
        assert res.status_code == 200
        assert res.headers["content-type"] in ("audio/mpeg", "audio/wav")
        assert len(res.content) > 500
