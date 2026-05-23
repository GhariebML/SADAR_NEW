# SADAR AI Agent

Professional local AI-agent layer for the SADAR RF spectrum anomaly detection system.

## Capabilities

- RAG over local RF/security reference documents in `data/external`
- Local Ollama integration with safe deterministic fallback
- Threat scoring for `Drone`, `Normal`, and `Jamming` detections
- Markdown incident report generation
- Response caching and feedback logging
- Lightweight JSON vector store for demos and offline use

## Main entry point

```python
from src.ai_agent import SADARAgent

agent = SADARAgent()
agent.build_knowledge_base(force=True)
answer = agent.ask("What should we do if jamming is detected?")
print(answer.answer)
```

## Threat analysis

```python
assessment = agent.analyze_threat({
    "label": "Jamming",
    "confidence": 0.92,
    "frequency_mhz": 2450,
    "snr_db": 24,
    "source": "SDR-01",
    "location": "Sector 7",
})
print(assessment.level, assessment.score)
```

## Optional Hugging Face embeddings

Hashing embeddings are used by default to avoid surprise model downloads. Enable
SentenceTransformers explicitly:

```powershell
$env:SADAR_USE_HF_EMBEDDINGS = "1"
```

## Optional Ollama

The agent works without Ollama, but generative answers improve when Ollama is running:

```bash
ollama pull llama3
ollama serve
```

Configure with:

- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`
- `OLLAMA_TIMEOUT`
