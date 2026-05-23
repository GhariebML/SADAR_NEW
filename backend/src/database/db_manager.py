"""SQLite connection utilities for SADAR."""

from __future__ import annotations

import sqlite3
from pathlib import Path


def open_connection(path: str | Path) -> sqlite3.Connection:
    """Open a SQLite connection and ensure the parent directory exists."""
    db_path = Path(path)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn
