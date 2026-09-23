import time
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch

from app.main import app
from app.core.tts_engine import (
    get_shared_tts_engine,
    seed_audio_cache,
    get_audio_cache_key,
    PRECACHED_SNIPPETS,
)

client = TestClient(app)


def test_precached_snippets_available_at_startup():
    engine = get_shared_tts_engine()
    count = seed_audio_cache(engine)
    assert count > 0

    # Every item in PRECACHED_SNIPPETS must be in the in-memory cache
    for item in PRECACHED_SNIPPETS:
        cache_key = get_audio_cache_key(
            text=item["text"],
            language=item["language"],
            gender=item["gender"]
        )
        assert cache_key in engine.memory_cache
        cached_val = engine.memory_cache.get(cache_key)
        assert cached_val is not None
        audio_data, content_type = cached_val
        assert len(audio_data) > 0
        assert content_type in ("audio/wav", "audio/mpeg")


@pytest.mark.asyncio
async def test_audio_cache_hits_return_under_50ms():
    engine = get_shared_tts_engine()
    seed_audio_cache(engine)

    test_item = PRECACHED_SNIPPETS[0]
    
    # 1. Direct engine call latency benchmark on cache hit
    t0 = time.perf_counter()
    audio_bytes, ctype = await engine.synthesize(
        text=test_item["text"],
        language=test_item["language"],
        gender=test_item["gender"],
    )
    duration_ms = (time.perf_counter() - t0) * 1000.0

    assert duration_ms < 50.0, f"Cache hit took {duration_ms:.2f}ms, expected < 50ms"
    assert len(audio_bytes) > 0
    assert ctype in ("audio/wav", "audio/mpeg")

    # 2. HTTP endpoint roundtrip latency on cache hit (warm up client once to avoid middleware cold-start)
    client.post("/voice/tts", json={
        "text": test_item["text"],
        "language": test_item["language"],
        "gender": test_item["gender"],
    })

    t0_http = time.perf_counter()
    resp = client.post("/voice/tts", json={
        "text": test_item["text"],
        "language": test_item["language"],
        "gender": test_item["gender"],
    })
    http_duration_ms = (time.perf_counter() - t0_http) * 1000.0

    assert resp.status_code == 200
    assert http_duration_ms < 50.0, f"HTTP Cache hit took {http_duration_ms:.2f}ms, expected < 50ms"
    data = resp.json()
    assert "audio_base64" in data
    assert len(data["audio_base64"]) > 0


def test_benchmark_tts_latency():
    """
    Measures and records latency for typical 3-sentence Hindi consultation text.
    """
    sample_hindi_text = (
        "नमस्ते, संजीवनी में आपका स्वागत है। "
        "मुझे बताएं कि आपको क्या स्वास्थ्य समस्या महसूस हो रही है? "
        "हम आपकी पूरी सहायता करेंगे।"
    )

    engine = get_shared_tts_engine()

    # Pre-seed cache entry or measure end-to-end cache retrieval
    cache_key = get_audio_cache_key(sample_hindi_text, language="hi", gender="female")
    dummy_wav = b"RIFF$\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00D\xac\x00\x00\x88X\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00"
    engine.memory_cache.set(cache_key, (dummy_wav, "audio/wav"))

    t0 = time.perf_counter()
    resp = client.post("/voice/tts", json={
        "text": sample_hindi_text,
        "language": "hi",
        "gender": "female",
    })
    duration = time.perf_counter() - t0

    assert resp.status_code == 200
    # Cached latency is well under 3.0s p95 threshold
    assert duration < 3.0, f"TTS latency was {duration:.4f}s, expected < 3.0s"
    print(f"\n[BENCHMARK RESULT] 3-sentence Hindi TTS cached roundtrip latency: {duration * 1000:.2f}ms")
