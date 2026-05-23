"""Email alert placeholder backend."""

from __future__ import annotations

from .alert_manager import AlertMessage


def send_email_alert(message: AlertMessage) -> bool:
    """Return success for a validated alert message.

    Real SMTP delivery should be wired with environment-provided credentials.
    """
    return bool(message.label and message.channel == "email")
