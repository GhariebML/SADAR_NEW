"""Configuration objects for the SADAR AI-agent package."""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .exceptions import ConfigurationError


PROJECT_ROOT = Path(__file__).resolve().parents[2]
AI_AGENT_DIR = Path(__file__).resolve().parent
CACHE_DIR = AI_AGENT_DIR / "cache"
PROMPTS_DIR = AI_AGENT_DIR / "prompts"


def env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError as exc:
        raise ConfigurationError(f"{name} must be an integer, got {value!r}") from exc


@dataclass(slots=True)
class AgentConfig:
    name: str = "SADAR AI Agent"
    project_root: Path | str = PROJECT_ROOT
    external_docs_dir: Path | str = PROJECT_ROOT / "data" / "external"
    cache_dir: Path | str = CACHE_DIR
    index_path: Path | str = CACHE_DIR / "rag_index.json"
    response_cache_path: Path | str = CACHE_DIR / "responses.json"
    feedback_path: Path | str = CACHE_DIR / "feedback.jsonl"
    prompts_dir: Path | str = PROMPTS_DIR
    default_top_k: int = 5
    min_retrieval_score: float = 0.0
    chunk_size: int = 900
    chunk_overlap: int = 120
    max_document_bytes: int = 2_000_000
    max_metadata_items: int = 50
    max_metadata_value_chars: int = 500
    ollama_base_url: str = field(
        default_factory=lambda: os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    )
    # ✅ command-r7b-arabic كـ default
    ollama_model: str = field(
        default_factory=lambda: os.getenv("OLLAMA_MODEL", "command-r7b-arabic:7b-02-2025-q4_K_M")
    )
    # ✅ 180 ثانية عشان command-r7b يكمل
    ollama_timeout: int = field(
        default_factory=lambda: env_int("OLLAMA_TIMEOUT", 180)
    )
    use_hf_embeddings: bool = field(
        default_factory=lambda: env_bool("SADAR_USE_HF_EMBEDDINGS", False)
    )

    def __post_init__(self) -> None:
        self.project_root = Path(self.project_root).resolve()
        self.external_docs_dir = Path(self.external_docs_dir).resolve()
        self.cache_dir = Path(self.cache_dir).resolve()
        self.index_path = Path(self.index_path).resolve()
        self.response_cache_path = Path(self.response_cache_path).resolve()
        self.feedback_path = Path(self.feedback_path).resolve()
        self.prompts_dir = Path(self.prompts_dir).resolve()

        if not self.name.strip():
            raise ConfigurationError("agent name must not be empty")
        if self.default_top_k < 1:
            raise ConfigurationError("default_top_k must be at least 1")
        if not 0.0 <= self.min_retrieval_score <= 1.0:
            raise ConfigurationError("min_retrieval_score must be between 0 and 1")
        if self.chunk_size < 100:
            raise ConfigurationError("chunk_size must be at least 100 characters")
        if self.chunk_overlap < 0 or self.chunk_overlap >= self.chunk_size:
            raise ConfigurationError("chunk_overlap must be non-negative and smaller than chunk_size")
        if self.max_document_bytes < 1:
            raise ConfigurationError("max_document_bytes must be positive")
        if self.ollama_timeout < 1:
            raise ConfigurationError("ollama_timeout must be positive")
        if not self.ollama_base_url.startswith(("http://", "https://")):
            raise ConfigurationError("ollama_base_url must start with http:// or https://")

    def ensure_dirs(self) -> None:
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "project_root": str(self.project_root),
            "external_docs_dir": str(self.external_docs_dir),
            "cache_dir": str(self.cache_dir),
            "index_path": str(self.index_path),
            "response_cache_path": str(self.response_cache_path),
            "feedback_path": str(self.feedback_path),
            "prompts_dir": str(self.prompts_dir),
            "default_top_k": self.default_top_k,
            "min_retrieval_score": self.min_retrieval_score,
            "chunk_size": self.chunk_size,
            "chunk_overlap": self.chunk_overlap,
            "max_document_bytes": self.max_document_bytes,
            "ollama_base_url": self.ollama_base_url,
            "ollama_model": self.ollama_model,
            "ollama_timeout": self.ollama_timeout,
            "use_hf_embeddings": self.use_hf_embeddings,
        }