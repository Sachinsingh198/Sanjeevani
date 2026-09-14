from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import chat, screen
from app.api import auth_api, admin_api
from app.models import create_tables, seed_default_admin
from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: create database tables and seed the default admin account."""
    create_tables()
    seed_default_admin()
    print("[Sanjeevani] Database initialized, admin seeded.")
    yield


app = FastAPI(
    title="Sanjeevani 2.0 API",
    description="Deterministic Safety-Tiered Clinical Triage & Edge Diagnostic Engine",
    version="2.0.0",
    lifespan=lifespan,
)

# Enable CORS for the React frontend (Vite port 5173 and production builds)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(auth_api.router)
app.include_router(admin_api.router)
app.include_router(chat.router)
app.include_router(screen.router)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "app_env": settings.APP_ENV,
        "default_language": settings.DEFAULT_LANGUAGE,
        "primary_llm_provider": settings.PRIMARY_LLM_PROVIDER,
        "collection_name": settings.QDRANT_COLLECTION_NAME,
    }