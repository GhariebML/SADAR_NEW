"""SQLite CRUD helpers for the SADAR API."""

from __future__ import annotations

import os
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any

PROJECT_ROOT     = Path(__file__).resolve().parents[2]
DB_PATH          = Path(os.getenv("SADAR_DB_PATH", PROJECT_ROOT / "data" / "database" / "spectrum.db"))
ALERT_THRESHOLD  = float(os.getenv("SADAR_ALERT_THRESHOLD", "0.75"))


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    _init_schema(conn)
    return conn


def _init_schema(conn: sqlite3.Connection) -> None:
    conn.execute("""
        CREATE TABLE IF NOT EXISTS signals (
            id                INTEGER PRIMARY KEY AUTOINCREMENT,
            label             TEXT    NOT NULL,
            confidence        REAL    NOT NULL,
            frequency         REAL,
            snr               REAL,
            strength          REAL,
            source            TEXT    NOT NULL DEFAULT 'SDR',
            inference_time_ms INTEGER NOT NULL DEFAULT 0,
            model_version     TEXT    NOT NULL DEFAULT 'unknown',
            station           TEXT,
            direction         TEXT,
            timestamp         TEXT    NOT NULL,
            lat               REAL,
            lng               REAL
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS alerts (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            signal_id  INTEGER NOT NULL,
            alert_type TEXT    NOT NULL,
            status     TEXT    NOT NULL DEFAULT 'created',
            location   TEXT    NOT NULL DEFAULT 'Unknown',
            timestamp  TEXT    NOT NULL,
            FOREIGN KEY(signal_id) REFERENCES signals(id)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            action    TEXT NOT NULL,
            details   TEXT NOT NULL,
            timestamp TEXT NOT NULL
        )
    """)
    conn.commit()


def _row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
    return dict(row)


def add_signal(
    label: str,
    confidence: float,
    frequency: float | None,
    snr: float | None,
    source: str,
    inference_time_ms: int,
    model_version: str,
    station: str | None = None,
    direction: str | None = None,
    strength: float | None = None,
    lat: float | None = None,
    lng: float | None = None,
) -> int | None:
    with _connect() as conn:
        cur = conn.execute(
            """
            INSERT INTO signals(
                label, confidence, frequency, snr, strength, source,
                inference_time_ms, model_version, station, direction,
                timestamp, lat, lng
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                label, confidence, frequency, snr, strength, source,
                inference_time_ms, model_version, station, direction,
                datetime.now().isoformat(), lat, lng,
            ),
        )
        conn.commit()
        return int(cur.lastrowid)


def get_all_signals() -> list[dict[str, Any]]:
    with _connect() as conn:
        return [
            _row_to_dict(r)
            for r in conn.execute(
                "SELECT * FROM signals ORDER BY id DESC"
            ).fetchall()
        ]


def get_signals_paginated(limit: int = 100, offset: int = 0) -> list[dict[str, Any]]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM signals ORDER BY id DESC LIMIT ? OFFSET ?",
            (limit, offset),
        ).fetchall()
        return [_row_to_dict(r) for r in rows]


def get_signals_filtered(label: str, limit: int = 100) -> list[dict[str, Any]]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM signals WHERE label = ? ORDER BY id DESC LIMIT ?",
            (label, limit),
        ).fetchall()
        return [_row_to_dict(r) for r in rows]


def auto_create_alert(
    signal_id: int,
    alert_type: str,
    location: str,
) -> int | None:
    """
    يحفظ alert في الـ database.
    القرار (هل يتبعت alert) اتعمل بالفعل في routes.py.
    الدالة دي بس بتحفظ وترجع الـ ID.
    """
    with _connect() as conn:
        # تحقق إن الـ signal موجود
        signal = conn.execute(
            "SELECT label, confidence FROM signals WHERE id = ?",
            (signal_id,),
        ).fetchone()

        if signal is None:
            return None

        # Normal مش بيتحفظ كـ alert
        if signal["label"] == "Normal":
            return None

        # ✅ حفظ الـ alert
        cur = conn.execute(
            """
            INSERT INTO alerts(signal_id, alert_type, status, location, timestamp)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                signal_id,
                alert_type,
                "created",
                location,
                datetime.now().isoformat(),
            ),
        )
        conn.commit()
        return int(cur.lastrowid)


def get_all_alerts(decrypt_fields: bool = True) -> list[dict[str, Any]]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM alerts ORDER BY id DESC"
        ).fetchall()
        return [_row_to_dict(r) for r in rows]


def get_alert_threshold() -> float:
    return ALERT_THRESHOLD


def log_action(action: str, details: str) -> None:
    with _connect() as conn:
        conn.execute(
            "INSERT INTO audit_logs(action, details, timestamp) VALUES (?, ?, ?)",
            (action, details, datetime.now().isoformat()),
        )
        conn.commit()