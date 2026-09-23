import json
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse
from app.core.logger import logger


def get_otp_key(request: Request) -> str:
    """
    Computes a composite key for OTP rate limiting based on client IP and target (phone/email).
    Extracts the target from request state or parsed json body cache.
    """
    ip = get_remote_address(request)
    target = getattr(request.state, "otp_target", None)
    if not target and hasattr(request, "_body") and request._body:
        try:
            body_json = json.loads(request._body)
            target = str(body_json.get("target", "")).strip().lower()
        except Exception:
            target = ""
    return f"{ip}:{target or 'unknown'}"


# Central limiter instance keyed by client IP by default
limiter = Limiter(key_func=get_remote_address, default_limits=[])


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """
    Standard 429 response returning the required bilingual message and Retry-After header.
    """
    logger.warning(f"[RateLimit] Rate limit exceeded for IP {get_remote_address(request)} on {request.url.path}")
    
    headers = {"Retry-After": "60"}
    detail_msg = "Bahut zyada anurodh. Kripya thodi der baad koshish karein. / Too many requests. Please try again later."
    return JSONResponse(
        status_code=429,
        headers=headers,
        content={
            "detail": detail_msg,
            "message": detail_msg,
            "error": "rate_limit_exceeded"
        }
    )


# Alias for explicit clarity
rate_limit_bilingual_handler = rate_limit_exceeded_handler
