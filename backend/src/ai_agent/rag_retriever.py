"""Retrieval-Augmented Generation support for SADAR."""

from __future__ import annotations

import logging
import re
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

from .config import AgentConfig
from .embedding_model import EmbeddingModel
from .exceptions import RetrievalError
from .vector_store import JsonVectorStore, SearchResult

logger = logging.getLogger(__name__)
_SENTENCE_RE = re.compile(r"(?<=[.!?؟])\s+")


@dataclass(slots=True)
class IndexBuildStats:
    """Summary of a knowledge-base indexing run."""

    path: str
    chunks: int
    sources: list[str]
    embedding_backend: str
    files_discovered: int = 0
    files_indexed: int = 0
    files_skipped: int = 0
    files_failed: int = 0
    failures: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class RAGConfig:
    """Configuration for local document indexing and retrieval."""

    project_root: Path
    external_docs_dir: Path
    index_path: Path
    chunk_size: int = 900
    chunk_overlap: int = 120
    top_k: int = 5
    min_score: float = 0.0
    max_document_bytes: int = 2_000_000

    @classmethod
    def from_agent_config(cls, config: AgentConfig) -> "RAGConfig":
        return cls(
            project_root=config.project_root,
            external_docs_dir=config.external_docs_dir,
            index_path=config.index_path,
            chunk_size=config.chunk_size,
            chunk_overlap=config.chunk_overlap,
            top_k=config.default_top_k,
            min_score=config.min_retrieval_score,
            max_document_bytes=config.max_document_bytes,
        )


class RAGRetriever:
    """Builds and queries a local document index."""

    def __init__(
        self,
        config: RAGConfig | None = None,
        embedding_model: EmbeddingModel | None = None,
        agent_config: AgentConfig | None = None,
    ) -> None:
        if config is None:
            config = RAGConfig.from_agent_config(agent_config or AgentConfig())
        self.config = config
        self.embedding_model = embedding_model or EmbeddingModel()
        self.store = JsonVectorStore(self.config.index_path, self.embedding_model)

    def build_index(self, force: bool = False) -> dict[str, Any]:
        """Index supported files under the configured external-documents directory."""
        if self.store.chunks and not force:
            return self._stats().to_dict()
        if force:
            self.store.clear()

        docs_dir = self.config.external_docs_dir
        if not docs_dir.exists():
            logger.info("RAG docs directory does not exist: %s", docs_dir)
            self.store.save()
            return self._stats().to_dict()

        files = self._discover_files(docs_dir)
        stats = self._stats(files_discovered=len(files))
        for path in files:
            try:
                if path.stat().st_size > self.config.max_document_bytes:
                    stats.files_skipped += 1
                    continue
                text = self._read_document(path)
                chunks = self._chunk_text(text)
                if not chunks:
                    stats.files_skipped += 1
                    continue
                metadatas = [{"chunk_index": index, "file": str(path)} for index in range(len(chunks))]
                source = self._safe_relative_source(path)
                self.store.add_texts(chunks, source=source, metadatas=metadatas, persist=False)
                stats.files_indexed += 1
            except Exception as exc:
                stats.files_failed += 1
                stats.failures.append(f"{path.name}: {exc}")
                logger.warning("Could not index %s: %s", path, exc)
        self.store.save()
        final = self._stats(files_discovered=stats.files_discovered)
        final.files_indexed = stats.files_indexed
        final.files_skipped = stats.files_skipped
        final.files_failed = stats.files_failed
        final.failures = stats.failures[:10]
        return final.to_dict()

    def retrieve(self, query: str, top_k: int | None = None, min_score: float | None = None) -> list[SearchResult]:
        if not self.store.chunks:
            self.build_index(force=False)
        return self.store.search(
            query,
            top_k=top_k or self.config.top_k,
            min_score=self.config.min_score if min_score is None else min_score,
        )

    def retrieve_context(self, query: str, top_k: int | None = None) -> str:
        results = self.retrieve(query, top_k=top_k)
        if not results:
            return "No relevant local reference documents were found."
        return "\n\n".join(
            f"[Source {index}: {result.chunk.source} | score={result.score:.3f}]\n{result.chunk.text}"
            for index, result in enumerate(results, start=1)
        )

    def _stats(self, files_discovered: int = 0) -> IndexBuildStats:
        base = self.store.stats()
        return IndexBuildStats(
            path=str(base["path"]),
            chunks=int(base["chunks"]),
            sources=list(base["sources"]),
            embedding_backend=str(base["embedding_backend"]),
            files_discovered=files_discovered,
        )

    def _discover_files(self, docs_dir: Path) -> list[Path]:
        files: list[Path] = []
        for pattern in ("*.txt", "*.md", "*.pdf"):
            files.extend(docs_dir.rglob(pattern))
        return sorted({path.resolve() for path in files if path.is_file()})

    def _safe_relative_source(self, path: Path) -> str:
        try:
            return str(path.relative_to(self.config.project_root))
        except ValueError:
            return str(path)

    def _read_document(self, path: Path) -> str:
        suffix = path.suffix.lower()
        if suffix in {".txt", ".md"}:
            return path.read_text(encoding="utf-8", errors="ignore")
        if suffix == ".pdf":
            try:
                from pypdf import PdfReader  # type: ignore

                reader = PdfReader(str(path))
                return "\n".join(page.extract_text() or "" for page in reader.pages)
            except Exception as exc:
                raise RetrievalError(f"PDF text extraction failed for {path.name}") from exc
        return ""

    def _chunk_text(self, text: str) -> list[str]:
        """Split text by paragraphs/sentences while respecting chunk size."""
        normalized = re.sub(r"[ \t]+", " ", text or "").strip()
        if not normalized:
            return []

        units: list[str] = []
        for paragraph in re.split(r"\n\s*\n", normalized):
            paragraph = paragraph.strip()
            if not paragraph:
                continue
            units.extend(part.strip() for part in _SENTENCE_RE.split(paragraph) if part.strip())

        size = max(self.config.chunk_size, 100)
        chunks: list[str] = []
        current = ""
        for unit in units or [normalized]:
            if len(unit) > size:
                if current:
                    chunks.append(current.strip())
                    current = ""
                chunks.extend(unit[start : start + size].strip() for start in range(0, len(unit), size))
                continue
            candidate = f"{current} {unit}".strip()
            if len(candidate) <= size:
                current = candidate
            else:
                if current:
                    chunks.append(current.strip())
                current = unit
        if current:
            chunks.append(current.strip())
        return [chunk for chunk in chunks if chunk]
