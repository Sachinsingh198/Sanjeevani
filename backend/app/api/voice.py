import base64
from fastapi import APIRouter, HTTPException, UploadFile, File, Request
from fastapi.responses import StreamingResponse
from app.config import settings
from app.schemas.voice_schemas import (
    TTSRequest, TTSResponse, STTResponse,
    VoiceProviderConfigRequest, VoiceProviderConfigResponse,
    AppSettingsRequest, AppSettingsResponse
)
from app.core.bhashini_engine import BhashiniVoiceEngine
from app.core.tts_engine import (
    IndicTTSEngine, get_shared_tts_engine,
    load_persisted_app_settings, save_persisted_app_settings
)
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
            provider=req.provider,
            model=req.model,
            speaker=req.speaker,
        )
        fmt = "wav" if "wav" in content_type else "mp3"
        provider = getattr(
            _indic_tts_engine,
            "last_provider",
            req.provider or _indic_tts_engine.get_primary_provider(),
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


@router.get("/provider", response_model=VoiceProviderConfigResponse)
async def get_voice_provider():
    """
    Returns the currently active primary voice provider,
    its automatic first fallback, model/speaker selections, and backend readiness.
    """
    return _indic_tts_engine.get_provider_status()


@router.post("/provider", response_model=VoiceProviderConfigResponse)
async def set_voice_provider(req: VoiceProviderConfigRequest):
    """
    Switches the primary voice provider between 'bhashini' and 'sarvam',
    and allows customizing models and speakers for each provider.
    """
    try:
        return _indic_tts_engine.set_provider_config(
            provider=req.provider,
            sarvam_model=req.sarvam_model,
            sarvam_speaker=req.sarvam_speaker,
            bhashini_model=req.bhashini_model,
            bhashini_gender=req.bhashini_gender,
            tts_speed=req.tts_speed,
            clear_cache=req.clear_cache,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/settings", response_model=AppSettingsResponse)
async def get_app_settings():
    """
    Returns persisted general application settings (audio speed, dialect assistance,
    health alerts, default language) that survive backend restarts.
    """
    data = load_persisted_app_settings()
    current_speed = getattr(_indic_tts_engine, "tts_speed", 1.0)
    return AppSettingsResponse(
        tts_speed=float(data.get("tts_speed", current_speed)),
        dialect_assistance=bool(data.get("dialect_assistance", True)),
        health_alerts=bool(data.get("health_alerts", True)),
        language_preference=str(data.get("language_preference", "hi")),
    )


@router.post("/settings", response_model=AppSettingsResponse)
async def set_app_settings(req: AppSettingsRequest):
    """
    Persists general application settings to disk across restarts.
    Also synchronizes tts_speed with the active IndicTTSEngine.
    """
    update_dict = {}
    if req.tts_speed is not None:
        update_dict["tts_speed"] = float(req.tts_speed)
        _indic_tts_engine.set_provider_config(tts_speed=req.tts_speed)
    if req.dialect_assistance is not None:
        update_dict["dialect_assistance"] = bool(req.dialect_assistance)
    if req.health_alerts is not None:
        update_dict["health_alerts"] = bool(req.health_alerts)
    if req.language_preference is not None:
        update_dict["language_preference"] = str(req.language_preference).strip()

    saved = save_persisted_app_settings(update_dict)
    return AppSettingsResponse(
        tts_speed=float(saved.get("tts_speed", 1.0)),
        dialect_assistance=bool(saved.get("dialect_assistance", True)),
        health_alerts=bool(saved.get("health_alerts", True)),
        language_preference=str(saved.get("language_preference", "hi")),
    )



@router.post("/tts", response_model=TTSResponse)
@limiter.limit("60/minute")
async def synthesize_speech(request: Request, req: TTSRequest):
    """
    Converts text to natural speech using active Primary Voice Provider (Bhashini / Sarvam)
    with automatic mutual fallback and Neural Indic (Edge TTS) offline fallback.
    """
    clean = _voice_engine.format_tts_payload(req.text, target_lang=req.language)["clean_text"]
    return await _synthesize_fallback(clean, req)


@router.post("/tts/stream")
@limiter.limit("60/minute")
async def synthesize_speech_stream(request: Request, req: TTSRequest):
    """
    Streams synthesized audio chunks directly from active provider for low-latency playback.
    """
    clean = _voice_engine.format_tts_payload(req.text, target_lang=req.language)["clean_text"]
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
            "X-TTS-Provider": getattr(_indic_tts_engine, "last_provider", _indic_tts_engine.get_primary_provider()),
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
    Transcribes spoken audio into text using active Primary Voice Provider
    with automatic mutual fallback.
    Handles code-mixed Hindi, Garhwali, and Indian-accented English.
    """
    try:
        audio_bytes = await file.read()
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Empty audio file received.")

        raw_ct = file.content_type or "audio/wav"
        clean_content_type = raw_ct.split(";")[0].strip().lower()
        if not clean_content_type or clean_content_type == "application/octet-stream":
            clean_content_type = "audio/webm" if (file.filename and file.filename.endswith(".webm")) else "audio/wav"

        primary = _indic_tts_engine.get_primary_provider()

        if primary == "sarvam":
            # 1. Primary: Sarvam STT
            if sarvam_stt_client.is_configured:
                try:
                    result = await sarvam_stt_client.transcribe_audio(
                        audio_bytes=audio_bytes,
                        content_type=clean_content_type,
                        model="saaras:v3",
                        mode="codemix",
                    )
                    return STTResponse(
                        transcript=result.get("transcript", ""),
                        language_code=result.get("language_code", "hi-IN"),
                        confidence=result.get("language_probability"),
                        provider="sarvam",
                    )
                except Exception as sarvam_err:
                    logger.warning(f"[Sarvam STT Primary Error]: {sarvam_err}. Falling back to Bhashini ASR.")

            # 2. Automatic Fallback 1: Bhashini ASR
            if bhashini_client.is_configured:
                try:
                    bhashini_res = await bhashini_client.transcribe(
                        audio_bytes=audio_bytes,
                        content_type=clean_content_type,
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
                    logger.error(f"[Bhashini ASR Fallback Error]: {bhashini_err}")

        else:
            # 1. Primary: Bhashini ASR
            if bhashini_client.is_configured:
                try:
                    bhashini_res = await bhashini_client.transcribe(
                        audio_bytes=audio_bytes,
                        content_type=clean_content_type,
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

            # 2. Automatic Fallback 1: Sarvam AI STT
            if sarvam_stt_client.is_configured:
                try:
                    result = await sarvam_stt_client.transcribe_audio(
                        audio_bytes=audio_bytes,
                        content_type=clean_content_type,
                        model="saaras:v3",
                        mode="codemix",
                    )
                    return STTResponse(
                        transcript=result.get("transcript", ""),
                        language_code=result.get("language_code", "hi-IN"),
                        confidence=result.get("language_probability"),
                        provider="sarvam",
                    )
                except Exception as sarvam_err:
                    logger.error(f"[Sarvam STT Fallback Error]: {sarvam_err}")

        raise HTTPException(
            status_code=503,
            detail="Speech recognition service is not configured: neither primary nor fallback service is available.",
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
    return _indic_tts_engine.get_provider_status()