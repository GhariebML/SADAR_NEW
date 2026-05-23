"""Apply SADAR SQLite migrations."""

from __future__ import annotations

import sqlite3
from pathlib import Path


def apply_sql_migration(conn: sqlite3.Connection, sql_path: str | Path) -> None:
    """Execute a SQL migration file in one transaction."""
    sql = Path(sql_path).read_text(encoding="utf-8")
    conn.executescript(sql)
    conn.commit()
