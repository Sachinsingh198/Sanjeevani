import pytest
from fastapi import FastAPI
from unittest.mock import patch
from app.config import settings
from app.main import lifespan

def test_config_loaded():
    assert settings.APP_ENV is not None
    assert settings.DEFAULT_LANGUAGE == "hi"

@pytest.mark.asyncio
async def test_production_fails_with_default_jwt_secret():
    """Startup must fail fast when APP_ENV is production and default JWT secret is unchanged."""
    app = FastAPI()
    with patch.object(settings, "APP_ENV", "production"):
        with patch.object(settings, "JWT_SECRET_KEY", settings.DEFAULT_JWT_SECRET_KEY):
            with pytest.raises(RuntimeError) as exc_info:
                async with lifespan(app):
                    pass
            assert "default JWT_SECRET_KEY in production" in str(exc_info.value)

@pytest.mark.asyncio
async def test_production_succeeds_with_overridden_jwt_secret():
    """Startup check passes in production when JWT_SECRET_KEY is overridden."""
    app = FastAPI()
    with patch.object(settings, "APP_ENV", "production"):
        with patch.object(settings, "JWT_SECRET_KEY", "custom-super-secure-production-secret-999"):
            with patch("app.main.create_tables"), patch("app.main.seed_default_admin"):
                async with lifespan(app):
                    pass

@pytest.mark.asyncio
async def test_development_boots_with_default_jwt_secret():
    """Development environment permits the default secret for convenient local development."""
    app = FastAPI()
    with patch.object(settings, "APP_ENV", "development"):
        with patch.object(settings, "JWT_SECRET_KEY", settings.DEFAULT_JWT_SECRET_KEY):
            with patch("app.main.create_tables"), patch("app.main.seed_default_admin"):
                async with lifespan(app):
                    pass