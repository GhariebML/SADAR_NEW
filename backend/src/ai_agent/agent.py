"""SADAR professional AI agent facade."""
from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, cast

from .config import AgentConfig
from .context_manager import ContextManager
from .feedback_loop import FeedbackLoop, Rating
from .llm_handler import LLMHandler
from .ollama_client import OllamaClient
from .query_engine import QueryEngine, QueryResult
from .rag_retriever import RAGRetriever
from .report_generator import ReportGenerator
from .response_cache import ResponseCache
from .threat_analyzer import SignalObservation, ThreatAnalyzer, ThreatAssessment


@dataclass(slots=True)
class AgentStatus:
    name: str
    rag: dict[str, Any]
    ollama: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class SADARAgent:
    """Professional AI assistant for RF anomaly detection operations."""

    def __init__(self, name: str | None = None, config: AgentConfig | None = None) -> None:
        self.config = config or AgentConfig()
        self.config.ensure_dirs()
        self.name = name or self.config.name                    # ✅ فيكس
        self.context = ContextManager()
        self.ollama_client = OllamaClient(agent_config=self.config)
        self.retriever = RAGRetriever(agent_config=self.config)
        self.llm = LLMHandler(client=self.ollama_client, config=self.config)
        self.cache = ResponseCache(config=self.config)
        self.query_engine = QueryEngine(
            retriever=self.retriever, llm=self.llm, cache=self.cache
        )
        self.threat_analyzer = ThreatAnalyzer(config=self.config)
        self.report_generator = ReportGenerator()                # ✅ فيكس
        self.feedback = FeedbackLoop(config=self.config)         # ✅ فيكس

    def build_knowledge_base(self, force: bool = False) -> dict[str, Any]:
        return self.retriever.build_index(force=force)           # ✅ فيكس

    def ask(self, question: str, refresh: bool = False, top_k: int | None = None) -> QueryResult:
        self.context.add("user", question)
        result = self.query_engine.ask(
            question, refresh=refresh, top_k=top_k or self.config.default_top_k
        )
        self.context.add("assistant", result.answer)
        return result

    def analyze_threat(
        self, observation: SignalObservation | dict[str, Any]
    ) -> ThreatAssessment:
        return self.threat_analyzer.assess(observation)

    def generate_incident_report(
        self,
        observation: SignalObservation | dict[str, Any],
        output_path: str | Path | None = None,
        analyst_notes: str = "",
    ) -> str:
        assessment = self.analyze_threat(observation)
        report = self.report_generator.incident_report(           # ✅ فيكس
            assessment, analyst_notes=analyst_notes
        )
        markdown = report.to_markdown()                           # ✅ فيكس
        if output_path:
            self.report_generator.save(report, output_path)      # ✅ فيكس
        return markdown

    def record_feedback(
        self,
        question: str,
        answer: str,
        rating: str = "neutral",
        comment: str = "",
    ) -> dict[str, Any]:
        item = self.feedback.record(                              # ✅ فيكس
            question, answer, rating=cast(Rating, rating), comment=comment
        )
        return asdict(item)

    def status(self) -> AgentStatus:
        return AgentStatus(
            name=self.name,                                       # ✅ فيكس
            rag=self.retriever.store.stats(),
            ollama=self.ollama_client.health(),                   # ✅ فيكس
        )


def create_agent(config: AgentConfig | None = None) -> SADARAgent:
    return SADARAgent(config=config)


if __name__ == "__main__":
    agent = create_agent()
    print(agent.status())
