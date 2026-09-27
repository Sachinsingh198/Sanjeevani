from contextlib import asynccontextmanager
import time
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.api import chat, screen
from app.api import auth_api, admin_api, activity_api
from app.api import asha
from app.models import create_tables, seed_default_admin, get_db
from app.config import settings
from app.api import voice
from app.api import reports
from app.api import companion
from app.core.logger import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: validate security configuration, init Sentry, create database tables and seed default admin."""
    if settings.APP_ENV.lower() == "production" and settings.JWT_SECRET_KEY == settings.DEFAULT_JWT_SECRET_KEY:
        raise RuntimeError(
            "CRITICAL SECURITY CONFIGURATION ERROR: Cannot boot with default JWT_SECRET_KEY in production! "
            "Set a strong, unique JWT_SECRET_KEY environment variable in your production configuration."
        )

    # Initialize Sentry error tracking if configured
    if getattr(settings, "SENTRY_DSN", None):
        try:
            import sentry_sdk
            from sentry_sdk.integrations.fastapi import FastApiIntegration

            def scrub_pii(event, hint):
                if "user" in event:
                    user = event["user"]
                    for field in ["ip_address", "username", "email", "phone", "id"]:
                        if field in user:
                            user[field] = "[SCRUBBED]"
                request = event.get("request", {})
                data = request.get("data")
                if isinstance(data, dict):
                    for k in list(data.keys()):
                        if any(pii_key in k.lower() for pii_key in ["name", "phone", "patient", "symptom", "otp", "password"]):
                            data[k] = "[SCRUBBED]"
                return event

            sentry_sdk.init(
                dsn=settings.SENTRY_DSN,
                integrations=[FastApiIntegration()],
                traces_sample_rate=0.1,
                before_send=scrub_pii,
                send_default_pii=False,
            )
            logger.info("[Sanjeevani] Sentry error tracking initialized successfully.")
        except Exception as sentry_err:
            logger.error(f"[Sanjeevani] Failed to initialize Sentry: {sentry_err}")

    try:
        create_tables()
        seed_default_admin()
        logger.info("[Sanjeevani] Database initialized, admin seeded.")
    except Exception as db_init_err:
        logger.warning(f"[Sanjeevani] Database initialization warning ({db_init_err}). Running in resilient offline-first mode.")

    t0 = time.perf_counter()
    logger.info("[Sanjeevani] Loading remedy store and embedding model into memory...")
    try:
        from app.core.hybrid_rag import get_shared_remedy_store
        app.state.remedy_store = get_shared_remedy_store()
        elapsed = time.perf_counter() - t0
        logger.info(f"[Sanjeevani] HybridRemedyStore successfully loaded in {elapsed:.2f}s.")
    except Exception as rag_err:
        logger.warning(f"[Sanjeevani] Cloud vector store could not be reached ({rag_err}). Running with local CCRAS remedy fallback.")
        app.state.remedy_store = None

    # Pre-cache common mission-critical audio snippets
    try:
        from app.core.tts_engine import seed_audio_cache
        seed_audio_cache()
    except Exception as tts_err:
        logger.warning(f"[Sanjeevani] TTS audio cache seeding skipped: {tts_err}")
    try:
        yield
    finally:
        if hasattr(app.state, "remedy_store") and app.state.remedy_store:
            try:
                app.state.remedy_store.close()
            except Exception as close_err:
                logger.warning(f"[Sanjeevani] Error closing remedy_store: {close_err}")



app = FastAPI(
    title="Sanjeevani 2.0 API",
    description="Deterministic Safety-Tiered Clinical Triage & Edge Diagnostic Engine",
    version="2.0.0",
    lifespan=lifespan,
)

# SlowAPI Rate Limiting setup
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.requests import Request
import json
from app.core.limiter import limiter, rate_limit_exceeded_handler

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

@app.middleware("http")
async def extract_rate_limit_targets(request: Request, call_next):
    if request.url.path == "/auth/otp/send" and request.method == "POST":
        body = await request.body()
        try:
            body_json = json.loads(body)
            request.state.otp_target = str(body_json.get("target", "")).strip().lower()
        except Exception:
            request.state.otp_target = ""
        request._body = body
    return await call_next(request)

# Enable CORS for the React frontend — origins driven by ALLOWED_ORIGINS env var
_cors_origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
_cors_kwargs = dict(
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Private-IP regex only for non-production (local dev / village LAN testing)
if settings.APP_ENV.lower() != "production":
    _cors_kwargs["allow_origin_regex"] = (
        r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:[0-9]+)?$"
    )
app.add_middleware(CORSMiddleware, **_cors_kwargs)

# Mount Routers
app.include_router(auth_api.router)
app.include_router(admin_api.router)
app.include_router(chat.router)
app.include_router(screen.router)
app.include_router(voice.router)
app.include_router(reports.router)
app.include_router(companion.router)
app.include_router(asha.router)
app.include_router(activity_api.router)


@app.get("/")
def root():
    return {
        "status": "healthy",
        "app": "Sanjeevani 2.0 API",
        "version": "2.0.0",
        "docs": "/docs",
        "health": "/health",
    }

@app.get("/health")
def health_check():
    import time
    from datetime import datetime, timezone

    # 1. Probe database (critical)
    db_status = "ok"
    db_latency_ms = None
    t0 = time.perf_counter()
    try:
        from app.db import get_db_connection
        from sqlalchemy import text
        with get_db_connection() as conn:
            conn.execute(text("SELECT 1"))
        db_latency_ms = round((time.perf_counter() - t0) * 1000, 2)
    except Exception as e:
        logger.error(f"[HealthCheck] Database probe failed: {e}")
        db_status = "error"

    # 2. Probe Qdrant / Remedy Store (non-critical, degrades gracefully)
    qdrant_status = "unreachable"
    try:
        from app.core.hybrid_rag import get_shared_remedy_store
        store = getattr(app.state, "remedy_store", None)
        if store is None:
            store = get_shared_remedy_store()
        if store and hasattr(store, "client") and store.client:
            col_name = getattr(store, "collection_name", settings.QDRANT_COLLECTION_NAME)
            if store.client.collection_exists(col_name):
                qdrant_status = "ok"
    except Exception as e:
        logger.warning(f"[HealthCheck] Qdrant probe error: {e}")
        qdrant_status = "unreachable"

    # 3. Probe configured LLM providers
    available_llms = []
    if settings.GROQ_API_KEY and settings.GROQ_API_KEY.strip():
        available_llms.append("groq")
    if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip():
        available_llms.append("gemini")
    if settings.SARVAM_API_KEY and settings.SARVAM_API_KEY.strip():
        available_llms.append("sarvam")

    primary = settings.PRIMARY_LLM_PROVIDER
    llm_provider = primary if primary in available_llms else (available_llms[0] if available_llms else "none")

    critical_ok = (db_status == "ok")
    degraded = (qdrant_status != "ok" or not available_llms)

    payload = {
        "status": "healthy" if (critical_ok and not degraded) else ("degraded" if critical_ok else "unhealthy"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": db_status,
        "qdrant": qdrant_status,
        "llm_provider": llm_provider,
        "degraded": degraded,
        "app_env": settings.APP_ENV,
        "default_language": settings.DEFAULT_LANGUAGE,
        "primary_llm_provider": settings.PRIMARY_LLM_PROVIDER,
        "collection_name": settings.QDRANT_COLLECTION_NAME,
        "dependencies": {
            "database": {
                "status": db_status,
                "latency_ms": db_latency_ms,
                "engine": "sqlite" if "sqlite" in settings.DATABASE_URL else "postgresql"
            },
            "vector_store": {
                "status": qdrant_status,
                "collection": settings.QDRANT_COLLECTION_NAME,
                "mode": "hybrid_rag"
            },
            "llm_providers": {
                "status": "ok" if available_llms else "none_configured",
                "available": available_llms,
                "primary": settings.PRIMARY_LLM_PROVIDER
            },
            "voice": {
                "tts_provider": settings.TTS_PROVIDER,
                "stt_provider": settings.STT_PROVIDER,
                "edge_tts_fallback": True,
                "sarvam_configured": bool(settings.SARVAM_API_KEY)
            }
        }
    }

    status_code = 200 if critical_ok else 503
    return JSONResponse(status_code=status_code, content=payload)