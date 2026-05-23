"""Embedding utilities for the SADAR AI agent.

The module can use SentenceTransformers when explicitly enabled, but defaults to
a deterministic hashing embedder so local demos never trigger surprise downloads.
"""

from __future__ import annotations

import hashlib
import math
import re
from dataclasses import dataclass
from typing import Sequence

from .config import env_bool

_TOKEN_RE = re.compile(r"[\w\u0600-\u06FF]+", re.UNICODE)


def tokenize(text: str) -> list[str]:
    """Tokenize English/Arabic alphanumeric text into lowercase terms."""
    return [token.lower() for token in _TOKEN_RE.findall(text or "")]


@dataclass(slots=True)
class EmbeddingConfig:
    """Configuration for embedding generation."""

    model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    dimension: int = 384
    normalize: bool = True
    use_sentence_transformers: bool = env_bool("SADAR_USE_HF_EMBEDDINGS", False)


class EmbeddingModel:
    """Small wrapper around SentenceTransformers with a no-dependency fallback."""

    def __init__(self, config: EmbeddingConfig | None = None) -> None:
        self.config = config or EmbeddingConfig()
        if self.config.dimension <= 0:
            raise ValueError("embedding dimension must be positive")
        self._backend = self._load_backend() if self.config.use_sentence_transformers else None

    def _load_backend(self):
        try:
            from sentence_transformers import SentenceTransformer  # type: ignore

            return SentenceTransformer(self.config.model_name)
        except Exception:
            return None

    @property
    def backend_name(self) -> str:
        return self.config.model_name if self._backend is not None else "hashing-fallback"

    def embed(self, text: str) -> list[float]:
        """Return one embedding vector for text."""
        vectors = self.embed_many([text])
        return vectors[0] if vectors else [0.0] * self.config.dimension

    def embed_many(self, texts: Sequence[str]) -> list[list[float]]:
        """Return embeddings for multiple texts."""
        if not texts:
            return []
        if self._backend is not None:
            vectors = self._backend.encode(list(texts), normalize_embeddings=self.config.normalize)
            return [list(map(float, vector)) for vector in vectors]
        return [self._hashing_embedding(text) for text in texts]

    def _hashing_embedding(self, text: str) -> list[float]:
        """Deterministic lightweight embedding using signed feature hashing."""
        vector = [0.0] * self.config.dimension
        for token in tokenize(text):
            digest = hashlib.blake2b(token.encode("utf-8"), digest_size=8).digest()
            value = int.from_bytes(digest, "big")
            index = value % self.config.dimension
            sign = 1.0 if ((value >> 8) & 1) else -1.0
            vector[index] += sign

        if self.config.normalize:
            norm = math.sqrt(sum(v * v for v in vector)) or 1.0
            vector = [v / norm for v in vector]
        return vector


def cosine_similarity(a: Sequence[float], b: Sequence[float]) -> float:
    """Compute cosine similarity between two vectors."""
    if not a or not b:
        return 0.0
    n = min(len(a), len(b))
    dot = sum(float(a[i]) * float(b[i]) for i in range(n))
    norm_a = math.sqrt(sum(float(x) * float(x) for x in a[:n]))
    norm_b = math.sqrt(sum(float(x) * float(x) for x in b[:n]))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (norm_a * norm_b)
