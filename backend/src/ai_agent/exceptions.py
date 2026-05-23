"""Custom exceptions for the SADAR AI-agent package."""

from __future__ import annotations


class SADARAgentError(Exception):
    """Base error for expected AI-agent failures."""


class ConfigurationError(SADARAgentError):
    """Raised when runtime configuration is invalid."""


class RetrievalError(SADARAgentError):
    """Raised when document retrieval/indexing fails."""


class LLMUnavailableError(SADARAgentError):
    """Raised when a configured LLM provider is unavailable."""


class ValidationError(SADARAgentError):
    """Raised when user or system input is invalid."""
