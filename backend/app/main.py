from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import chat, screen
from app.api import auth_api, admin_api
from app.models import create_tables, seed_default_admin
from app.config import settings
from app.api import voice
from app.api import reports
from app.api import companion
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: validate security configuration, create database tables and seed default admin."""
    if settings.APP_ENV.lower() == "production" and settings.JWT_SECRET_KEY == settings.DEFAULT_JWT_SECRET_KEY:
        raise RuntimeError(
            "CRITICAL SECURITY CONFIGURATION ERROR: Cannot boot with default JWT_SECRET_KEY in production! "
            "Set a strong, unique JWT_SECRET_KEY environment variable in your production configuration."
        )
    create_tables()
    seed_default_admin()

    import time
    t0 = time.perf_counter()
    print("[Sanjeevani] Loading remedy store and embedding model into memory...")
    from app.core.hybrid_rag import HybridRemedyStore
    app.state.remedy_store = HybridRemedyStore()
    elapsed = time.perf_counter() - t0
    print(f"[Sanjeevani] HybridRemedyStore successfully loaded in {elapsed:.2f}s.")

    print("[Sanjeevani] Database initialized, admin seeded.")
    yield


app = FastAPI(
    title="Sanjeevani 2.0 API",
    description="Deterministic Safety-Tiered Clinical Triage & Edge Diagnostic Engine",
    version="2.0.0",
    lifespan=lifespan,
)

# Enable CORS for the React frontend (Vite port 5173 and preview/production ports)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    # Matches localhost, 127.0.0.1, 192.168.x.x, 10.x.x.x, or 172.16-31.x.x on any port
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# Mount Routers
app.include_router(auth_api.router)
app.include_router(admin_api.router)
app.include_router(chat.router)
app.include_router(screen.router)
app.include_router(voice.router)
app.include_router(reports.router)
app.include_router(companion.router)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "app_env": settings.APP_ENV,
        "default_language": settings.DEFAULT_LANGUAGE,
        "primary_llm_provider": settings.PRIMARY_LLM_PROVIDER,
        "collection_name": settings.QDRANT_COLLECTION_NAME,
    }