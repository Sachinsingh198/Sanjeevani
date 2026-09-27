"""
Resilience & Retry Utilities for Sanjeevani 2.0.
Provides exponential backoff with jitter for external network and provider calls:
- LLM inference calls (Groq, Gemini, Sarvam)
- Voice synthesis and recognition (Sarvam STT/TTS, Bhashini)
- Notification delivery (Gmail SMTP, SMS Gateways)
"""
import asyncio
import functools
import random
import time
from typing import Callable, TypeVar, Any, Tuple, Type, Optional
from app.core.logger import logger

T = TypeVar("T")


def calculate_backoff(
    attempt: int,
    base_delay: float = 0.5,
    max_delay: float = 4.0,
    backoff_factor: float = 2.0,
    jitter: bool = True,
) -> float:
    """Calculates exponential delay with optional randomized full/decorrelated jitter."""
    delay = min(max_delay, base_delay * (backoff_factor ** attempt))
    if jitter:
        # Full jitter: random sleep between 0.5*delay and 1.0*delay
        delay = delay * (0.5 + random.random() * 0.5)
    return max(0.05, delay)


async def retry_async(
    func: Callable[..., Any],
    *args: Any,
    max_retries: int = 2,
    base_delay: float = 0.5,
    max_delay: float = 4.0,
    backoff_factor: float = 2.0,
    retry_exceptions: Tuple[Type[Exception], ...] = (Exception,),
    caller_name: str = "async_call",
    **kwargs: Any,
) -> Any:
    """Executes an async function with exponential backoff retry."""
    last_exc: Optional[Exception] = None
    for attempt in range(max_retries + 1):
        try:
            return await func(*args, **kwargs)
        except retry_exceptions as exc:
            last_exc = exc
            if attempt < max_retries:
                delay = calculate_backoff(attempt, base_delay, max_delay, backoff_factor)
                logger.warning(
                    f"[{caller_name}] Attempt {attempt + 1}/{max_retries + 1} failed ({type(exc).__name__}: {exc}). "
                    f"Retrying in {delay:.2f}s..."
                )
                await asyncio.sleep(delay)
            else:
                logger.error(f"[{caller_name}] All {max_retries + 1} attempts exhausted. Final error: {exc}")
    if last_exc:
        raise last_exc


def retry_sync(
    func: Callable[..., Any],
    *args: Any,
    max_retries: int = 2,
    base_delay: float = 0.5,
    max_delay: float = 4.0,
    backoff_factor: float = 2.0,
    retry_exceptions: Tuple[Type[Exception], ...] = (Exception,),
    caller_name: str = "sync_call",
    **kwargs: Any,
) -> Any:
    """Executes a synchronous function with exponential backoff retry."""
    last_exc: Optional[Exception] = None
    for attempt in range(max_retries + 1):
        try:
            return func(*args, **kwargs)
        except retry_exceptions as exc:
            last_exc = exc
            if attempt < max_retries:
                delay = calculate_backoff(attempt, base_delay, max_delay, backoff_factor)
                logger.warning(
                    f"[{caller_name}] Attempt {attempt + 1}/{max_retries + 1} failed ({type(exc).__name__}: {exc}). "
                    f"Retrying in {delay:.2f}s..."
                )
                time.sleep(delay)
            else:
                logger.error(f"[{caller_name}] All {max_retries + 1} attempts exhausted. Final error: {exc}")
    if last_exc:
        raise last_exc


def with_retry_async(
    max_retries: int = 2,
    base_delay: float = 0.5,
    max_delay: float = 4.0,
    backoff_factor: float = 2.0,
    retry_exceptions: Tuple[Type[Exception], ...] = (Exception,),
    caller_name: Optional[str] = None,
):
    """Decorator for async functions to automatically apply retry with exponential backoff."""
    def decorator(fn: Callable[..., Any]):
        name = caller_name or fn.__name__

        @functools.wraps(fn)
        async def wrapper(*args: Any, **kwargs: Any):
            return await retry_async(
                fn,
                *args,
                max_retries=max_retries,
                base_delay=base_delay,
                max_delay=max_delay,
                backoff_factor=backoff_factor,
                retry_exceptions=retry_exceptions,
                caller_name=name,
                **kwargs,
            )
        return wrapper
    return decorator


def with_retry_sync(
    max_retries: int = 2,
    base_delay: float = 0.5,
    max_delay: float = 4.0,
    backoff_factor: float = 2.0,
    retry_exceptions: Tuple[Type[Exception], ...] = (Exception,),
    caller_name: Optional[str] = None,
):
    """Decorator for sync functions to automatically apply retry with exponential backoff."""
    def decorator(fn: Callable[..., Any]):
        name = caller_name or fn.__name__

        @functools.wraps(fn)
        def wrapper(*args: Any, **kwargs: Any):
            return retry_sync(
                fn,
                *args,
                max_retries=max_retries,
                base_delay=base_delay,
                max_delay=max_delay,
                backoff_factor=backoff_factor,
                retry_exceptions=retry_exceptions,
                caller_name=name,
                **kwargs,
            )
        return wrapper
    return decorator
