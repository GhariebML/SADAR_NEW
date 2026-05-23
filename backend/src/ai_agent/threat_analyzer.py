"""Threat analysis logic for SADAR detections."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any, Literal

from .config import AgentConfig
from .exceptions import ValidationError

ThreatLevel = Literal["low", "medium", "high", "critical"]
KNOWN_LABELS = {"normal", "drone", "jamming"}


@dataclass(slots=True)
class SignalObservation:
    """Classifier output plus operational RF metadata."""

    label: str
    confidence: float
    frequency_mhz: float | None = None
    snr_db: float | None = None
    source: str = "unknown"
    location: str = "unknown"
    metadata: dict[str, Any] = field(default_factory=dict)

    def normalized_label(self) -> str:
        return self.label.strip().lower()


@dataclass(slots=True)
class ThreatAssessment:
    """Operational threat decision generated from one signal observation."""

    level: ThreatLevel
    score: float
    summary: str
    recommended_actions: list[str]
    timestamp: str
    evidence: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class ThreatAnalyzer:
    """Converts model predictions and RF metadata into an operational assessment."""

    def __init__(self, config: AgentConfig | None = None) -> None:
        self.config = config or AgentConfig()

    def assess(self, observation: SignalObservation | dict[str, Any]) -> ThreatAssessment:
        obs = observation if isinstance(observation, SignalObservation) else SignalObservation(**observation)
        self._validate(obs)
        label = obs.normalized_label()
        score = self._score(obs, label)
        level = self._level(score)
        return ThreatAssessment(
            level=level,
            score=round(score, 3),
            summary=self._summary(obs, level, score),
            recommended_actions=self._actions(label, level),
            timestamp=datetime.now(timezone.utc).isoformat(),
            evidence={
                "label": obs.label,
                "confidence": obs.confidence,
                "frequency_mhz": obs.frequency_mhz,
                "snr_db": obs.snr_db,
                "source": obs.source,
                "location": obs.location,
                **obs.metadata,
            },
        )

    def _validate(self, obs: SignalObservation) -> None:
        if not 0.0 <= float(obs.confidence) <= 1.0:
            raise ValidationError("confidence must be between 0 and 1")
        if not obs.label.strip():
            raise ValidationError("label must not be empty")
        if obs.frequency_mhz is not None and obs.frequency_mhz < 0:
            raise ValidationError("frequency_mhz must be positive")
        if len(obs.metadata) > self.config.max_metadata_items:
            raise ValidationError(f"metadata must contain at most {self.config.max_metadata_items} items")
        for key, value in obs.metadata.items():
            if len(str(key)) > 100:
                raise ValidationError("metadata keys must be 100 characters or fewer")
            if len(str(value)) > self.config.max_metadata_value_chars:
                raise ValidationError(
                    f"metadata values must be {self.config.max_metadata_value_chars} characters or fewer"
                )

    def _score(self, obs: SignalObservation, label: str) -> float:
        base = {"normal": 0.1, "drone": 0.65, "jamming": 0.8}.get(label, 0.4)
        score = base * max(0.0, min(float(obs.confidence), 1.0))
        if obs.snr_db is not None and obs.snr_db > 20:
            score += 0.05
        if obs.frequency_mhz is not None and 2400 <= obs.frequency_mhz <= 2500:
            score += 0.07
        if label not in KNOWN_LABELS:
            score += 0.05
        return max(0.0, min(score, 1.0))

    def _level(self, score: float) -> ThreatLevel:
        if score >= 0.85:
            return "critical"
        if score >= 0.65:
            return "high"
        if score >= 0.35:
            return "medium"
        return "low"

    def _actions(self, label: str, level: ThreatLevel) -> list[str]:
        if label == "normal":
            return ["Continue passive monitoring.", "Log the event for baseline spectrum statistics."]

        actions = [
            "Verify the signal using a second observation window.",
            "Record raw I/Q samples and spectrogram evidence.",
        ]
        if label == "drone":
            actions.extend([
                "Check for nearby UAV activity.",
                "Escalate to operations if signal persists or moves toward a restricted area.",
            ])
        elif label == "jamming":
            actions.extend([
                "Inspect affected frequency band for communication degradation.",
                "Notify the RF/security team immediately if confidence remains high.",
            ])
        else:
            actions.append("Treat the unknown label as suspicious until verified by an analyst.")

        if level in {"high", "critical"}:
            actions.append("Create an incident ticket with timestamp, source, location, and model confidence.")
        return actions

    def _summary(self, obs: SignalObservation, level: ThreatLevel, score: float) -> str:
        return (
            f"Detected {obs.label} with {obs.confidence:.1%} model confidence. "
            f"Operational threat level is {level.upper()} (score {score:.2f}). "
            f"Source={obs.source}, Location={obs.location}."
        )
