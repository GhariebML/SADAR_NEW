"""Ollama HTTP client used by the SADAR local AI agent."""
from __future__ import annotations

import json
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any

from .config import AgentConfig
from .exceptions import LLMUnavailableError


@dataclass(slots=True)
class OllamaConfig:
    base_url: str
    model: str
    timeout: int = 180

    @classmethod
    def from_agent_config(cls, config: AgentConfig) -> "OllamaConfig":
        return cls(
            base_url=config.ollama_base_url,
            model=config.ollama_model,
            timeout=config.ollama_timeout,
        )


class OllamaClient:
    """Minimal dependency-free Ollama API client."""

    def __init__(
        self,
        config: OllamaConfig | None = None,
        agent_config: AgentConfig | None = None,
    ) -> None:
        self.config = config or OllamaConfig.from_agent_config(agent_config or AgentConfig())
        self.base_url = self.config.base_url.rstrip("/")

    def health(self) -> dict[str, Any]:
        try:
            data = self._request("GET", "/api/tags", None)
            return {
                "ok": True,
                "models": [m.get("name") for m in data.get("models", [])],
            }
        except Exception as exc:
            return {"ok": False, "error": str(exc)}

    def generate(
        self,
        prompt: str,
        system: str | None = None,
        model: str | None = None,
        temperature: float = 0.2,
        max_tokens: int = 512,
    ) -> str:
        payload: dict[str, Any] = {
            "model": model or self.config.model,
            "prompt": prompt,
            "system": system or "",
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
                "num_ctx": 2048,
            },
        }
        data = self._request("POST", "/api/generate", payload)
        return str(data.get("response", "")).strip()

    def chat(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
        temperature: float = 0.2,
    ) -> str:
        payload = {
            "model": model or self.config.model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": 512,
                "num_ctx": 2048,
            },
        }
        data = self._request("POST", "/api/chat", payload)
        return str(data.get("message", {}).get("content", "")).strip()

    def _request(
        self, method: str, path: str, payload: dict[str, Any] | None
    ) -> dict[str, Any]:
        body = None if payload is None else json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            self.base_url + path,
            data=body,
            method=method,
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=self.config.timeout) as resp:
                raw = resp.read()
                return json.loads(raw.decode("utf-8"))
        except urllib.error.URLError as exc:
            raise LLMUnavailableError(
                f"Ollama is not reachable at {self.base_url}. "
                f"Start it and run: ollama pull {self.config.model}"
            ) from exc