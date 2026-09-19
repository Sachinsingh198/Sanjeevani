import base64
from fastapi import APIRouter, HTTPException
from app.config import settings
from app.schemas.voice_schemas import TTSRequest, TTSResponse
from app.core.ai4bharat_tts import ai4bharat_tts_engine, TTSNotReadyError
from app.core.bhashini_engine import BhashiniVoiceEngine
from app.core.tts_engine import IndicTTSEngine

router = APIRouter(prefix="/voice", tags=["Voice / TTS"])

# Reuses the same markdown-stripping cleaner already used for speech
# synthesis payloads (strips **bold**, *italic*, # headers before speaking).
_voice_engine = BhashiniVoiceEngine()
_indic_tts_engine = IndicTTSEngine()


async def _synthesize_fallback(clean_text: str, req: TTSRequest) -> TTSResponse:
    try:
        audio_bytes, content_type = await _indic_tts_engine.synthesize(
            text=clean_text,
            language=req.language,
            gender=req.gender,
        )
        fmt = "wav" if "wav" in content_type else "mp3"
        provider = getattr(_indic_tts_engine, "last_provider", "sarvam" if settings.TTS_PROVIDER == "sarvam" else "neural_indic")
        return TTSResponse(
            audio_base64=base64.b64encode(audio_bytes).decode("utf-8"),
            format=fmt,
            language=req.language,
            provider=provider,
        )
    except Exception as fallback_err:
        raise HTTPException(
            status_code=503,
            detail=f"TTS synthesis and fallback both failed: {fallback_err}",
        )


@router.post("/tts", response_model=TTSResponse)
async def synthesize_speech(req: TTSRequest):
    """
    Converts text to natural speech using Sarvam AI (bulbul:v3),
    Neural Indic (Edge TTS), or self-hosted AI4Bharat.
    """
    clean = _voice_engine.format_tts_payload(req.text)["clean_text"]

    # When TTS_PROVIDER is "sarvam" or "neural", return fluent Indian speech with instant playback
    if settings.TTS_PROVIDER in ("sarvam", "neural"):
        return await _synthesize_fallback(clean, req)

    if ai4bharat_tts_engine.status["status"] == "not_loaded":
        ai4bharat_tts_engine.start_background_load()

    try:
        result = await ai4bharat_tts_engine.synthesize(
            text=clean,
            language=req.language,
            gender=req.gender,
        )
        return TTSResponse(
            audio_base64=result["audio_base64"],
            format=result["format"],
            language=result["language"],
            provider="ai4bharat",
        )
    except TTSNotReadyError:
        return await _synthesize_fallback(clean, req)
    except Exception:
        return await _synthesize_fallback(clean, req)


@router.get("/tts/health")
async def tts_health():
    """Lets the frontend (or you, while debugging) check model load status."""
    status = ai4bharat_tts_engine.status
    return {**status, "provider": settings.TTS_PROVIDER}