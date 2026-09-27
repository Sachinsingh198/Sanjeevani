import json
import logging
import sys
from datetime import datetime, timezone
from typing import Optional, Any, Dict
from app.config import settings


_IGNORED_LOG_ATTRS = {
    "args", "asctime", "created", "exc_info", "exc_text", "filename",
    "funcName", "levelname", "levelno", "lineno", "module", "msecs",
    "message", "msg", "name", "pathname", "process", "processName",
    "relativeCreated", "stack_info", "thread", "threadName"
}


class JsonFormatter(logging.Formatter):
    """
    JSON log formatter for production environments.
    Formats logs as structured single-line JSON objects including extra context.
    """
    def format(self, record: logging.LogRecord) -> str:
        log_obj: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
            "message": record.getMessage(),
        }

        # Extract any extra attributes attached to the LogRecord
        extra_fields = {
            k: v for k, v in record.__dict__.items()
            if k not in _IGNORED_LOG_ATTRS and not k.startswith("_")
        }
        if extra_fields:
            log_obj["extra"] = extra_fields

        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_obj, ensure_ascii=False)


def setup_logger(name: str = "sanjeevani") -> logging.Logger:
    """Configures and returns a logger instance according to APP_ENV and LOG_FORMAT."""
    log = logging.getLogger(name)
    if log.handlers:
        return log

    app_env = str(getattr(settings, "APP_ENV", "development")).lower()
    log_format = str(getattr(settings, "LOG_FORMAT", "text")).lower()
    is_json = (app_env == "production") or (log_format == "json")

    log_level_str = str(getattr(settings, "LOG_LEVEL", "INFO")).upper()
    level = getattr(logging, log_level_str, logging.INFO if app_env == "production" else logging.DEBUG)
    log.setLevel(level)

    handler = logging.StreamHandler(sys.stdout)
    if is_json:
        handler.setFormatter(JsonFormatter())
    else:
        dev_fmt = logging.Formatter(
            fmt="%(asctime)s [%(levelname)s] [%(name)s:%(funcName)s:%(lineno)d]: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
        handler.setFormatter(dev_fmt)

    log.addHandler(handler)
    log.propagate = False
    return log


def get_logger(name: str) -> logging.Logger:
    """Helper to get a named logger with proper configuration."""
    return setup_logger(name)


logger = setup_logger("sanjeevani")
