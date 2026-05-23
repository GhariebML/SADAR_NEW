"""Audit log helpers."""

from __future__ import annotations

from src.database.crud import log_action


def record_security_event(action: str, details: str) -> None:
    """Record a security/audit event in the SADAR database."""
    log_action(action=action, details=details)
