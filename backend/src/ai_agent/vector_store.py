"""Local JSON vector store for SADAR RAG documents."""

from __future__ import annotations

import json
import logging
import uuid
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Sequence

from .embedding_model import EmbeddingModel, cosine_similarity

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class DocumentChunk:
    """A searchable document chunk."""

    id: str
    text: str
    source: str
    metadata: dict[str, Any] = field(default_factory=dict)
    embedding: list[float] = field(default_factory=list)


@dataclass(slots=True)
class SearchResult:
    """Result returned by vector search."""

    chunk: DocumentChunk
    score: float


class JsonVectorStore:
    """Simple persistent vector index using JSON.

    This dependency-light store is suitable for local demos and tests. It can be
    replaced by FAISS, Chroma, or Qdrant behind the same public methods later.
    """

    def __init__(self, path: str | Path, embedding_model: EmbeddingModel | None = None) -> None:
        self.path = Path(path)
        self.embedding_model = embedding_model or EmbeddingModel()
        self.chunks: list[DocumentChunk] = []
        self.load()

    def load(self) -> None:
        """Load the index from disk; fall back to an empty index if corrupt."""
        if not self.path.exists():
            self.chunks = []
            return
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
            self.chunks = [DocumentChunk(**item) for item in data.get("chunks", [])]
        except (json.JSONDecodeError, TypeError, OSError) as exc:
            logger.warning("Could not load vector index %s: %s", self.path, exc)
            self.chunks = []

    def save(self) -> None:
        """Persist the index atomically."""
        self.path.parent.mkdir(parents=True, exist_ok=True)
        payload = {"version": 1, "chunks": [asdict(chunk) for chunk in self.chunks]}
        tmp_path = self.path.with_suffix(self.path.suffix + ".tmp")
        tmp_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        tmp_path.replace(self.path)

    def clear(self) -> None:
        self.chunks.clear()
        self.save()

    def add_texts(
        self,
        texts: Sequence[str],
        source: str,
        metadatas: Sequence[dict[str, Any]] | None = None,
        persist: bool = True,
    ) -> list[DocumentChunk]:
        """Embed and append text chunks."""
        clean_texts = [text.strip() for text in texts if text and text.strip()]
        if not clean_texts:
            return []

        vectors = self.embedding_model.embed_many(clean_texts)
        created: list[DocumentChunk] = []
        for index, text in enumerate(clean_texts):
            chunk = DocumentChunk(
                id=str(uuid.uuid4()),
                text=text,
                source=source,
                metadata=(metadatas[index] if metadatas and index < len(metadatas) else {}),
                embedding=vectors[index],
            )
            self.chunks.append(chunk)
            created.append(chunk)

        if persist:
            self.save()
        return created

    def search(self, query: str, top_k: int = 5, min_score: float = 0.0) -> list[SearchResult]:
        """Return top-k nearest chunks sorted by similarity."""
        if not self.chunks or not query.strip():
            return []
        query_vector = self.embedding_model.embed(query)
        results = [SearchResult(chunk, cosine_similarity(query_vector, chunk.embedding)) for chunk in self.chunks]
        results.sort(key=lambda result: result.score, reverse=True)
        return [result for result in results[: max(top_k, 0)] if result.score >= min_score]

    def stats(self) -> dict[str, Any]:
        return {
            "path": str(self.path),
            "chunks": len(self.chunks),
            "sources": sorted({chunk.source for chunk in self.chunks}),
            "embedding_backend": self.embedding_model.backend_name,
        }
