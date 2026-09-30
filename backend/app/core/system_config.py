"""
Dynamic System Configuration Service for Sanjeevani.
Empowers Administrators to manage AI models, voice providers, triage parameters,
and feature flags directly from the Admin Dashboard without changing codebase.
Persists settings across database and local disk with sub-millisecond in-memory cache.
"""
import os
import json
import time
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy import select, insert, update
from app.config import settings
from app.core.logger import logger

SETTINGS_DATA_DIR = os.path.join(os.getcwd(), "DATA")
if not os.path.exists(SETTINGS_DATA_DIR) and os.path.exists(os.path.join(os.getcwd(), "backend", "DATA")):
    SETTINGS_DATA_DIR = os.path.join(os.getcwd(), "backend", "DATA")
os.makedirs(SETTINGS_DATA_DIR, exist_ok=True)
CONFIG_BACKUP_FILE = os.path.join(SETTINGS_DATA_DIR, "system_settings.json")

# Default system configuration derived from config.py and clinical guidelines
DEFAULT_SYSTEM_CONFIG: Dict[str, Any] = {
    # ── AI & LLM Engine ──────────────────────────────────────────────
    "primary_llm_provider": getattr(settings, "PRIMARY_LLM_PROVIDER", "groq"),
    "groq_model": getattr(settings, "GROQ_MODEL", "openai/gpt-oss-120b"),
    "gemini_model": getattr(settings, "GEMINI_MODEL", "gemini-1.5-flash"),
    "sarvam_model": getattr(settings, "SARVAM_CHAT_MODEL", "sarvam-30b"),
    "temperature": 0.3,
    "max_tokens": 1200,
    "custom_system_prompt": "",

    # ── Voice / Speech Engine ─────────────────────────────────────────
    "primary_voice_provider": getattr(settings, "PRIMARY_VOICE_PROVIDER", "bhashini"),
    "tts_speed": 1.0,
    "dialect_assistance": True,
    "preferred_speaker_gender": "female",
    "indic_tts_speaker": "Divya",

    # ── Clinical Triage & Emergency Thresholds ────────────────────────
    "emergency_keywords": [
        "chest pain", "severe shortness of breath", "unconscious",
        "coughing blood", "heavy bleeding", "bluish lips", "seizure",
        "choking", "chhati me dard", "saans lene me takleef", "behosh",
        "khoon ki ulti", "high fever with convulsion"
    ],
    "max_triage_turns": 5,
    "auto_dispatch_sos": True,
    "safety_disclaimer_text": "यह AI स्वास्थ्य परामर्श है, आपातकाल में 108 पर संपर्क करें। (Sanjeevani AI Advisory)",

    # ── System Flags & Operations ────────────────────────────────────
    "enable_rate_limiting": getattr(settings, "ENABLE_RATE_LIMITING", True),
    "enable_dev_otp_hint": getattr(settings, "ENABLE_DEV_OTP_HINT", False),
    "maintenance_mode": False,
    "offline_sync_mode": True,
    "enable_crowd_surveillance": True,
}

# In-memory thread-safe runtime cache for microsecond reads
_RUNTIME_CONFIG: Dict[str, Any] = dict(DEFAULT_SYSTEM_CONFIG)
_INITIALIZED: bool = False


def _load_from_disk() -> Dict[str, Any]:
    """Fallback reader from disk backup JSON."""
    try:
        if os.path.exists(CONFIG_BACKUP_FILE):
            with open(CONFIG_BACKUP_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        logger.warning(f"[SystemConfig] Error reading disk backup: {e}")
    return {}


def _save_to_disk(cfg: Dict[str, Any]):
    """Atomic write to disk backup JSON."""
    try:
        tmp_file = CONFIG_BACKUP_FILE + ".tmp"
        with open(tmp_file, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=2, ensure_ascii=False)
        if os.path.exists(CONFIG_BACKUP_FILE):
            os.replace(tmp_file, CONFIG_BACKUP_FILE)
        else:
            os.rename(tmp_file, CONFIG_BACKUP_FILE)
    except Exception as e:
        logger.warning(f"[SystemConfig] Error writing disk backup: {e}")


def init_system_config():
    """
    Initializes dynamic system settings on application startup.
    Loads values from database first, then disk fallback, or defaults.
    """
    global _RUNTIME_CONFIG, _INITIALIZED
    merged = dict(DEFAULT_SYSTEM_CONFIG)

    # 1. Merge disk backup if present
    disk_data = _load_from_disk()
    merged.update(disk_data)

    # 2. Merge from database table if accessible
    try:
        from app.db import get_db_connection, system_settings_table, rows_to_dicts
        with get_db_connection() as conn:
            rows = conn.execute(select(system_settings_table)).fetchall()
            for r in rows_to_dicts(rows):
                k = r.get("key")
                raw_val = r.get("value")
                if k and raw_val is not None:
                    try:
                        merged[k] = json.loads(raw_val)
                    except Exception:
                        merged[k] = raw_val
    except Exception as db_err:
        logger.debug(f"[SystemConfig] DB load note (using cached/disk): {db_err}")

    _RUNTIME_CONFIG = merged
    _INITIALIZED = True
    logger.info(f"[SystemConfig] Dynamic settings initialized. Active LLM: {_RUNTIME_CONFIG.get('primary_llm_provider')}, Voice: {_RUNTIME_CONFIG.get('primary_voice_provider')}")


def get_system_config() -> Dict[str, Any]:
    """Returns the current active dynamic system configuration."""
    global _INITIALIZED
    if not _INITIALIZED:
        init_system_config()
    return dict(_RUNTIME_CONFIG)


def update_system_config(updates: Dict[str, Any], admin_name: str = "Admin") -> Dict[str, Any]:
    """
    Updates system configuration in-memory, writes to DB, and saves to backup disk.
    Allows admin to dynamically adjust settings in real-time without restarting the app.
    """
    global _RUNTIME_CONFIG
    if not _INITIALIZED:
        init_system_config()

    sanitized = {}
    for k, v in updates.items():
        if k in DEFAULT_SYSTEM_CONFIG:
            # Type preservation
            expected_type = type(DEFAULT_SYSTEM_CONFIG[k])
            try:
                if expected_type == bool:
                    sanitized[k] = bool(v)
                elif expected_type == int:
                    sanitized[k] = int(v)
                elif expected_type == float:
                    sanitized[k] = float(v)
                elif expected_type == list:
                    sanitized[k] = list(v) if isinstance(v, (list, tuple)) else [x.strip() for x in str(v).split(",") if x.strip()]
                else:
                    sanitized[k] = str(v)
            except Exception:
                sanitized[k] = v

    _RUNTIME_CONFIG.update(sanitized)
    _save_to_disk(_RUNTIME_CONFIG)

    # Persist to database
    try:
        from app.db import get_db_connection, system_settings_table
        with get_db_connection() as conn:
            for k, val in sanitized.items():
                cat = "llm" if "llm" in k or "model" in k or "token" in k or "temperature" in k or "prompt" in k \
                    else "voice" if "voice" in k or "tts" in k or "speaker" in k \
                    else "triage" if "emergency" in k or "triage" in k or "sos" in k or "disclaimer" in k \
                    else "system"
                json_str = json.dumps(val, ensure_ascii=False)
                existing = conn.execute(
                    select(system_settings_table.c.key).where(system_settings_table.c.key == k)
                ).fetchone()
                if existing:
                    conn.execute(
                        update(system_settings_table)
                        .where(system_settings_table.c.key == k)
                        .values(
                            value=json_str,
                            category=cat,
                            updated_by=admin_name,
                            updated_at=datetime.now(timezone.utc),
                        )
                    )
                else:
                    conn.execute(
                        insert(system_settings_table).values(
                            key=k,
                            value=json_str,
                            category=cat,
                            updated_by=admin_name,
                        )
                    )
    except Exception as db_err:
        logger.warning(f"[SystemConfig] Database persistence warning: {db_err}")

    logger.info(f"[SystemConfig] Config updated by {admin_name}: {list(sanitized.keys())}")
    return get_system_config()


def reset_system_config_to_defaults(admin_name: str = "Admin") -> Dict[str, Any]:
    """Resets all configuration keys to default values."""
    return update_system_config(DEFAULT_SYSTEM_CONFIG, admin_name=f"{admin_name} (Reset)")
