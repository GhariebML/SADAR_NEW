"""Logging setup helpers."""

from __future__ import annotations

import logging


def get_logger(name: str) -> logging.Logger:
    """Return a project logger with a safe default configuration."""
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s — %(message)s")
    return logging.getLogger(name)
