import json
import logging
import sys
from datetime import datetime, timezone
from app.config import settings


class JsonFormatter(logging.Formatter):
    """
    JSON log formatter for production environments.
    Formats logs as structured single-line JSON objects.
    """
    def format(self, record: logging.LogRecord) -> str:
        log_obj = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_obj, ensure_ascii=False)


def setup_logger(name: str = "sanjeevani") -> logging.Logger:
    """Configures and returns a logger instance according to APP_ENV."""
    log = logging.getLogger(name)
    if log.handlers:
        return log

    is_prod = str(getattr(settings, "APP_ENV", "development")).lower() == "production"
    log.setLevel(logging.INFO if is_prod else logging.DEBUG)

    handler = logging.StreamHandler(sys.stdout)
    if is_prod:
        handler.setFormatter(JsonFormatter())
    else:
        dev_fmt = logging.Formatter(
            fmt="%(asctime)s [%(levelname)s] [%(name)s]: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
        handler.setFormatter(dev_fmt)

    log.addHandler(handler)
    log.propagate = False
    return log


logger = setup_logger("sanjeevani")
