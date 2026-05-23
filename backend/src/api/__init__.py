"""SADAR API package.

Avoid importing route modules at package import time so partially implemented
subsystems (database/model routes) do not prevent independent modules such as
agent_routes from loading.
"""

__all__ = []
