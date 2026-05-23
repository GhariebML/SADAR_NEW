"""Professional report generation for SADAR incidents and sessions."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from .threat_analyzer import ThreatAssessment


@dataclass(slots=True)
class ReportSection:
    title: str
    body: str


@dataclass(slots=True)
class Report:
    title: str
    sections: list[ReportSection]
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_markdown(self) -> str:
        lines = [f"# {self.title}", "", f"Generated: {self.created_at}", ""]
        for section in self.sections:
            lines.extend([f"## {section.title}", "", section.body.strip(), ""])
        return "\n".join(lines).strip() + "\n"


class ReportGenerator:
    """Creates operational Markdown reports."""

    def incident_report(self, assessment: ThreatAssessment, analyst_notes: str = "") -> Report:
        evidence = "\n".join(f"- **{k}**: {v}" for k, v in assessment.evidence.items())
        actions = "\n".join(f"- {item}" for item in assessment.recommended_actions)
        sections = [
            ReportSection("Executive Summary", assessment.summary),
            ReportSection("Threat Rating", f"Level: **{assessment.level.upper()}**\n\nScore: **{assessment.score:.3f}**"),
            ReportSection("Evidence", evidence or "No structured evidence provided."),
            ReportSection("Recommended Actions", actions),
        ]
        if analyst_notes:
            sections.append(ReportSection("Analyst Notes", analyst_notes))
        return Report(title="SADAR RF Threat Assessment Report", sections=sections)

    def qa_report(self, question: str, answer: str, sources: list[str] | None = None) -> Report:
        source_text = "\n".join(f"- {s}" for s in (sources or [])) or "No local sources were cited."
        return Report(
            title="SADAR AI Agent Response Report",
            sections=[
                ReportSection("Question", question),
                ReportSection("Answer", answer),
                ReportSection("Sources", source_text),
            ],
        )

    def save(self, report: Report, output_path: str | Path) -> Path:
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(report.to_markdown(), encoding="utf-8")
        return path
