"""High-level question answering engine for SADAR."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

from .exceptions import ValidationError
from .llm_handler import LLMHandler
from .rag_retriever import RAGRetriever
from .response_cache import ResponseCache


@dataclass(slots=True)
class QueryResult:
    """Structured response returned by the query engine."""

    question: str
    answer: str
    sources: list[str]
    used_cache: bool
    used_fallback: bool

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class QueryEngine:
    """Combines cache, RAG retrieval, and LLM generation."""

    def __init__(
        self,
        retriever: RAGRetriever | None = None,
        llm: LLMHandler | None = None,
        cache: ResponseCache | None = None,
    ) -> None:
        self.retriever = retriever or RAGRetriever()
        self.llm = llm or LLMHandler()
        self.cache = cache or ResponseCache()

    def ask(self, question: str, *, refresh: bool = False, top_k: int = 5) -> QueryResult:
        normalized = question.strip()
        if not normalized:
            raise ValidationError("question must not be empty")

        if not refresh:
            cached = self.cache.get(normalized)
            if cached:
                return QueryResult(
                    question=normalized,
                    answer=str(cached["answer"]),
                    sources=list(cached.get("sources", [])),
                    used_cache=True,
                    used_fallback=bool(cached.get("used_fallback", False)),
                )

        results = self.retriever.retrieve(normalized, top_k=top_k)
        context = "\n\n".join(
            f"Source: {result.chunk.source}\nScore: {result.score:.3f}\n{result.chunk.text}"
            for result in results
        ) or "No local context found."
        response = self.llm.answer_with_context(normalized, context)
        sources = list(dict.fromkeys(result.chunk.source for result in results))
        self.cache.set(
            normalized,
            {"answer": response.content, "sources": sources, "used_fallback": response.used_fallback},
        )
        return QueryResult(normalized, response.content, sources, False, response.used_fallback)
