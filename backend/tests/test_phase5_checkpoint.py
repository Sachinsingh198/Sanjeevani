import os
import sys
import subprocess
import pytest
from unittest.mock import patch, MagicMock
from app.db.engine import get_engine, normalize_db_url
from app.agents.graph import get_checkpointer
from scripts.migrate_sqlite_to_postgres import migrate, TABLE_ORDER


def test_url_normalization():
    assert normalize_db_url("postgres://user:pass@localhost:5432/sanjeevani") == "postgresql://user:pass@localhost:5432/sanjeevani"
    assert normalize_db_url("postgresql://user:pass@localhost:5432/sanjeevani") == "postgresql://user:pass@localhost:5432/sanjeevani"
    assert normalize_db_url("sqlite:///sanjeevani.db") == "sqlite:///sanjeevani.db"
    assert normalize_db_url("") == ""


def test_engine_dialect_detection():
    # 1. SQLite dialect detection
    sqlite_engine = get_engine("sqlite:///:memory:")
    assert sqlite_engine.dialect.name == "sqlite"

    # 2. PostgreSQL dialect configuration (mocked create_engine to avoid requiring running pg instance)
    with patch("app.db.engine.create_engine") as mock_create_engine:
        mock_pg_engine = MagicMock()
        mock_pg_engine.dialect.name = "postgresql"
        mock_create_engine.return_value = mock_pg_engine

        pg_engine = get_engine("postgresql://user:secret@localhost:5432/sanjeevani")
        assert pg_engine.dialect.name == "postgresql"
        mock_create_engine.assert_called_once_with(
            "postgresql://user:secret@localhost:5432/sanjeevani",
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True,
            pool_recycle=300,
            future=True,
        )


def test_get_checkpointer_sqlite_and_postgres():
    # 1. SQLite checkpointer
    sqlite_cp = get_checkpointer("sqlite:///test_sessions.db")
    assert sqlite_cp is not None
    assert "Saver" in type(sqlite_cp).__name__

    # 2. Postgres checkpointer with mocked PostgresSaver
    mock_saver_instance = MagicMock()
    mock_saver_instance.__enter__.return_value = mock_saver_instance
    mock_saver_cls = MagicMock(return_value=mock_saver_instance)
    mock_saver_cls.from_conn_string.return_value = mock_saver_instance
    mock_pg_module = MagicMock(PostgresSaver=mock_saver_cls)

    with patch.dict("sys.modules", {"langgraph.checkpoint.postgres": mock_pg_module}):
        with patch("psycopg_pool.ConnectionPool"):
            pg_cp = get_checkpointer("postgresql://pguser:pgpass@remotehost:5432/sanjeevani")
            assert pg_cp == mock_saver_instance
            mock_saver_instance.setup.assert_called_once()


def test_migration_dry_run():
    # Test programmatic dry-run
    report = migrate(dry_run=True)
    assert isinstance(report, dict)
    
    expected_tables = ["users", "otps", "conversation_index", "patient_encounters", "analytics_events"]
    for tbl in expected_tables:
        assert tbl in report
        assert "source_rows" in report[tbl]
        assert isinstance(report[tbl]["source_rows"], int)
        assert report[tbl]["source_rows"] >= 0


def test_migration_cli_dry_run():
    # Test CLI invocation of migrate_sqlite_to_postgres.py --dry-run
    script_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "scripts",
        "migrate_sqlite_to_postgres.py"
    )
    result = subprocess.run(
        [sys.executable, script_path, "--dry-run"],
        capture_output=True,
        text=True,
        check=True
    )
    assert "SANJEEVANI DATABASE MIGRATION — DRY-RUN MODE" in result.stdout
    assert "Dry run completed." in result.stdout
