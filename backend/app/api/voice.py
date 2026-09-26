import base64
from fastapi import APIRouter, HTTPException, UploadFile, File, Request
from fastapi.responses import StreamingResponse
from app.config import settings
from app.schemas.voice_schemas import TTSRequest, TTSResponse, STTResponse
from app.core.bhashini_engine import BhashiniVoiceEngine
from app.core.tts_engine import IndicTTSEngine, get_shared_tts_engine
from app.core.limiter import limiter
from app.core.logger import logger
from app.core.bhashini_client import bhashini_client
from app.core.sarvam_stt import (
    sarvam_stt_client,
    SarvamNotConfiguredError,
    SarvamSTTRequestError,
)

router = APIRouter(prefix="/voice", tags=["Voice / TTS / STT"])

# Reuses the same markdown-stripping cleaner already used for speech
# synthesis payloads (strips **bold**, *italic*, # headers before speaking).
_voice_engine = BhashiniVoiceEngine()
_indic_tts_engine = get_shared_tts_engine()


async def _synthesize_fallback(clean_text: str, req: TTSRequest) -> TTSResponse:
    try:
        audio_bytes, content_type = await _indic_tts_engine.synthesize(
            text=clean_text,
            language=req.language,
            gender=req.gender,
        )
        fmt = "wav" if "wav" in content_type else "mp3"
        provider = getattr(
            _indic_tts_engine,
            "last_provider",
            settings.TTS_PROVIDER,
        )
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
@limiter.limit("60/minute")
async def synthesize_speech(request: Request, req: TTSRequest):
    """
    Converts text to natural speech using Sarvam AI (bulbul:v3)
    with Neural Indic (Edge TTS) fallback.
    """
    clean = _voice_engine.format_tts_payload(req.text)["clean_text"]
    return await _synthesize_fallback(clean, req)


@router.post("/tts/stream")
@limiter.limit("60/minute")
async def synthesize_speech_stream(request: Request, req: TTSRequest):
    """
    Streams synthesized audio chunks directly from Sarvam AI for low-latency playback.
    Falls back seamlessly to neural Indic synthesis if unconfigured.
    """
    clean = _voice_engine.format_tts_payload(req.text)["clean_text"]
    if not clean:
        clean = "Namaste."

    return StreamingResponse(
        _indic_tts_engine.synthesize_stream(
            text=clean,
            language=req.language,
            gender=req.gender,
        ),
        media_type="audio/mpeg",
        headers={
            "Cache-Control": "no-cache",
            "X-TTS-Provider": getattr(_indic_tts_engine, "last_provider", "sarvam_stream"),
        },
    )


@router.get("/tts/stream")
async def synthesize_speech_stream_get(text: str = "Namaste", language: str = "hi", gender: str = "female"):
    """
    GET variant allowing native browser <audio> progressive stream buffering.
    """
    req = TTSRequest(text=text, language=language, gender=gender)
    return await synthesize_speech_stream(req)


@router.post("/stt", response_model=STTResponse)
@limiter.limit("30/minute")
async def transcribe_speech(
    request: Request,
    file: UploadFile = File(...),
):
    """
    Transcribes spoken audio into text.
    Primary: Bhashini ASR (AI4Bharat Conformer model)
    Fallback: Sarvam AI (Saaras v3)
    Handles code-mixed Hindi, Garhwali, and Indian-accented English.
    """
    try:
        audio_bytes = await file.read()
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Empty audio file received.")

        content_type = file.content_type or "audio/wav"

        # 1. Primary: Bhashini ASR
        if bhashini_client.is_configured:
            try:
                bhashini_res = await bhashini_client.transcribe(
                    audio_bytes=audio_bytes,
                    content_type=content_type,
                    language="hi",
                )
                if bhashini_res.get("transcript"):
                    return STTResponse(
                        transcript=bhashini_res.get("transcript", ""),
                        language_code=bhashini_res.get("language_code", "hi"),
                        confidence=bhashini_res.get("confidence", 0.95),
                        provider="bhashini",
                    )
            except Exception as bhashini_err:
                logger.warning(f"[Bhashini ASR Primary Error]: {bhashini_err}. Falling back to Sarvam AI STT.")

        # 2. Fallback: Sarvam AI STT
        if sarvam_stt_client.is_configured:
            try:
                result = await sarvam_stt_client.transcribe_audio(
                    audio_bytes=audio_bytes,
                    content_type=content_type,
                    model="saaras:v3",
                    mode="codemix",
                )
                return STTResponse(
                    transcript=result.get("transcript", ""),
                    language_code=result.get("language_code", "hi-IN"),
                    confidence=result.get("language_probability"),
                    provider="sarvam",
                )
            except SarvamNotConfiguredError as cfg_err:
                raise HTTPException(
                    status_code=503,
                    detail=f"Sarvam STT is not configured: {cfg_err}",
                )
            except SarvamSTTRequestError as req_err:
                raise HTTPException(
                    status_code=502,
                    detail=f"Sarvam STT request failed: {req_err}",
                )
            except Exception as sarvam_err:
                logger.error(f"[Sarvam STT Fallback Error]: {sarvam_err}")
                raise HTTPException(
                    status_code=502,
                    detail=f"Speech recognition fallback (Sarvam) also failed: {sarvam_err}",
                )

        raise HTTPException(
            status_code=503,
            detail="Neither Bhashini nor Sarvam STT is configured or available.",
        )
    except HTTPException:
        raise
    except Exception as general_err:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error in speech recognition: {general_err}",
        )


@router.get("/tts/health")
async def tts_health():
    """Lets the frontend (or health checks) verify TTS provider readiness."""
    return {
        "status": "ready",
        "provider": settings.TTS_PROVIDER,
        "primary": "bhashini",
        "fallback": "sarvam",
        "bhashini_configured": bhashini_client.is_configured,
        "sarvam_stt_configured": sarvam_stt_client.is_configured,
    }