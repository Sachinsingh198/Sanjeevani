#!/usr/bin/env python3
"""
Sanjeevani SQLite to PostgreSQL Migration Tool.
Reads all rows from source SQLite DB using SQLAlchemy Core and inserts them idempotently
into the target PostgreSQL database according to foreign key dependencies:
1. users
2. otps
3. conversation_index
4. patient_encounters
5. analytics_events

Supports --dry-run flag to inspect row counts without modifying the target database.
"""

import os
import sys
import argparse
from typing import Dict, Any, List

# Ensure backend root is on sys.path
backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

from sqlalchemy import select, func
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from app.config import settings
from app.core.logger import logger
from app.db.engine import get_engine, normalize_db_url
from app.db.schema import (
    metadata,
    users_table,
    otps_table,
    conversation_index_table,
    patient_encounters_table,
    analytics_events_table,
    create_all_tables,
)

# Ordered tables respecting foreign key hierarchies
TABLE_ORDER = [
    users_table,
    otps_table,
    conversation_index_table,
    patient_encounters_table,
    analytics_events_table,
]


def migrate(
    source_url: str = None,
    target_url: str = None,
    dry_run: bool = False,
) -> Dict[str, Any]:
    """
    Executes or simulates migration from source SQLite database to target database.
    Returns migration statistics per table.
    """
    default_src = settings.DATABASE_URL
    default_tgt = os.getenv("TARGET_DATABASE_URL", "")

    # If settings.DATABASE_URL is already PostgreSQL, default target to it and source to local SQLite
    if default_src.startswith("postgresql://") or default_src.startswith("postgres://"):
        default_tgt = default_src
        default_src = os.getenv("SOURCE_DATABASE_URL", "sqlite:///sanjeevani.db")

    source_db_url = normalize_db_url(
        source_url or os.getenv("SOURCE_DATABASE_URL") or default_src
    )
    target_db_url = normalize_db_url(
        target_url or default_tgt
    )

    logger.info(f"[Migration] Source Database: {source_db_url}")
    source_engine = get_engine(source_db_url)

    report: Dict[str, Dict[str, int]] = {}

    if dry_run:
        print("\n" + "=" * 60)
        print("  SANJEEVANI DATABASE MIGRATION — DRY-RUN MODE")
        print("=" * 60)
        print(f"Source URL : {source_db_url}")
        print(f"Target URL : {target_db_url or '(Not Specified - Dry Run)'}")
        print("-" * 60)

        with source_engine.connect() as src_conn:
            for table in TABLE_ORDER:
                try:
                    count = src_conn.execute(
                        select(func.count()).select_from(table)
                    ).scalar() or 0
                except Exception as e:
                    logger.warning(f"[Migration Dry-Run] Could not read {table.name}: {e}")
                    count = 0
                report[table.name] = {"source_rows": count, "migrated_rows": 0}
                print(f"  [DRY-RUN] Table '{table.name}': {count:6d} rows detected in source.")

        print("=" * 60)
        print("Dry run completed. No data was written to target.\n")
        return report

    # Non-dry-run mode requires target_url
    if not target_db_url:
        raise ValueError(
            "Target database URL is required for live migration. "
            "Set TARGET_DATABASE_URL env var or provide target_url."
        )

    logger.info(f"[Migration] Target Database: {target_db_url}")
    target_engine = get_engine(target_db_url)

    # 1. Create all tables on target if missing
    create_all_tables(target_engine)

    print("\n" + "=" * 60)
    print("  SANJEEVANI DATABASE MIGRATION — LIVE EXECUTION")
    print("=" * 60)
    print(f"Source URL : {source_db_url}")
    print(f"Target URL : {target_db_url}")
    print("-" * 60)

    is_pg_target = target_engine.dialect.name == "postgresql"
    is_sqlite_target = target_engine.dialect.name == "sqlite"

    with source_engine.connect() as src_conn, target_engine.begin() as tgt_conn:
        for table in TABLE_ORDER:
            rows = src_conn.execute(select(table)).mappings().all()
            source_count = len(rows)
            migrated_count = 0

            pk_cols = [c.name for c in table.primary_key.columns]

            for row in rows:
                row_dict = dict(row)
                if is_pg_target:
                    stmt = pg_insert(table).values(row_dict).on_conflict_do_nothing(index_elements=pk_cols)
                elif is_sqlite_target:
                    stmt = sqlite_insert(table).values(row_dict).on_conflict_do_nothing(index_elements=pk_cols)
                else:
                    stmt = table.insert().values(row_dict)

                result = tgt_conn.execute(stmt)
                if result.rowcount and result.rowcount > 0:
                    migrated_count += 1

            # Verify total count in target
            total_in_target = tgt_conn.execute(
                select(func.count()).select_from(table)
            ).scalar() or 0

            report[table.name] = {
                "source_rows": source_count,
                "migrated_rows": migrated_count,
                "target_total": total_in_target,
            }
            print(f"  [MIGRATED] Table '{table.name}': {source_count} source -> {migrated_count} inserted (Total in target: {total_in_target})")

    print("=" * 60)
    print("Migration completed successfully.\n")
    return report


def main():
    parser = argparse.ArgumentParser(
        description="Migrate Sanjeevani relational data from SQLite to PostgreSQL."
    )
    parser.add_argument(
        "--source-url",
        type=str,
        default=None,
        help="Source SQLite database URL (defaults to SOURCE_DATABASE_URL or settings.DATABASE_URL)",
    )
    parser.add_argument(
        "--target-url",
        type=str,
        default=None,
        help="Target PostgreSQL database URL (defaults to TARGET_DATABASE_URL)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Inspect and report source row counts without modifying target database",
    )

    args = parser.parse_args()

    try:
        migrate(
            source_url=args.source_url,
            target_url=args.target_url,
            dry_run=args.dry_run,
        )
    except Exception as e:
        logger.error(f"[Migration Error]: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
