import logging
import logging.config
import os
from pathlib import Path

_LOG_DIR = Path(__file__).resolve().parent / "logs"
_LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

_LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "%(asctime)s | %(levelname)s | %(name)s | %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
        "access": {
            "format": "%(asctime)s | %(levelname)s | %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "level": "NOTSET",
            "formatter": "default",
            "stream": "ext://sys.stderr",
        },
        "uvicorn_console": {
            "class": "logging.StreamHandler",
            "level": "NOTSET",
            "formatter": "default",
            "stream": "ext://sys.stderr",
        },
        "app_file": {
            "class": "logging.handlers.RotatingFileHandler",
            "level": "NOTSET",
            "formatter": "default",
            "filename": str(_LOG_DIR / "app.log"),
            "maxBytes": 5 * 1024 * 1024,  # 5 MB
            "backupCount": 5,
            "encoding": "utf-8",
        },
        "db_file": {
            "class": "logging.handlers.RotatingFileHandler",
            "level": "NOTSET",
            "formatter": "default",
            "filename": str(_LOG_DIR / "db.log"),
            "maxBytes": 5 * 1024 * 1024,  # 5 MB
            "backupCount": 5,
            "encoding": "utf-8",
        },
    },
    "loggers": {
        "uvicorn": {
            "handlers": ["uvicorn_console"],
            "level": _LOG_LEVEL,
            "propagate": False,
        },
        "uvicorn.error": {
            "handlers": ["uvicorn_console"],
            "level": _LOG_LEVEL,
            "propagate": False,
        },
        "uvicorn.access": {
            "handlers": ["uvicorn_console"],
            "level": _LOG_LEVEL,
            "propagate": False,
        },
        # Application request/response timing logs.
        "lcfa3.app": {
            "handlers": ["console", "app_file"],
            "level": _LOG_LEVEL,
            "propagate": False,
        },
        # SQLAlchemy query timing logs.
        "lcfa3.db": {
            "handlers": ["console", "db_file"],
            "level": _LOG_LEVEL,
            "propagate": False,
        },
    },
}


def setup_logging() -> None:
    """Apply the application logging configuration.

    Must be called before any loggers are used (ideally at import time in
    ``main``) so that handlers are installed before uvicorn applies its own
    config. Uses ``disable_existing_loggers: False`` so named loggers are not
    silently switched off.
    """
    os.makedirs(_LOG_DIR, exist_ok=True)
    logging.config.dictConfig(_LOGGING_CONFIG)