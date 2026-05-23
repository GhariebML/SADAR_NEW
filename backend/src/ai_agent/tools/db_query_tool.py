"""Safe read-only SQLite query helper for SADAR."""

from __future__ import annotations

import re
import sqlite3
from pathlib import Path
from typing import Any

from ..exceptions import ValidationError

_FORBIDDEN_SQL = re.compile(r"\b(insert|update|delete|drop|alter|create|attach|detach|pragma|vacuum|replace)\b", re.I)


def _validate_select_query(query: str) -> str:
    cleaned = query.strip().rstrip(";").strip()
    if not cleaned:
        raise ValidationError("query must not be empty")
    if ";" in cleaned:
        raise ValidationError("multiple SQL statements are not allowed")
    if not cleaned.lower().startswith("select"):
        raise ValidationError("only SELECT queries are allowed")
    if _FORBIDDEN_SQL.search(cleaned):
        raise ValidationError("query contains a forbidden SQL keyword")
    return cleaned


def run_readonly_query(
    db_path: str | Path,
    query: str,
    params: tuple[Any, ...] = (),
    limit: int = 100,
) -> list[dict[str, Any]]:
    """Execute a bounded SELECT query and return rows as dictionaries."""
    path = Path(db_path)
    if not path.exists() or not path.is_file():
        raise ValidationError(f"database file does not exist: {path}")
    safe_limit = max(1, min(int(limit), 1_000))
    safe_query = f"SELECT * FROM ({_validate_select_query(query)}) AS readonly_query LIMIT {safe_limit}"

    conn = sqlite3.connect(f"file:{path.resolve()}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(safe_query, params).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()
