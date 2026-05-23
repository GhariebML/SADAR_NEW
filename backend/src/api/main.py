"""
main.py — SADAR Spectrum API
"""
import os
import sys
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src/database"))
from fastapi import APIRouter
try:
    from src.api.routes import router
except Exception as exc:
    router = APIRouter()
    _routes_error = exc
else:
    _routes_error = None
from src.api.agent_routes import router as agent_router
from src.api.websocket import ws_router
from src.api.middleware import LoggingMiddleware
from src.api.mock_routes import mock_router          # ← سطر جديد

logger = logging.getLogger("spectrum.main")
if _routes_error is not None:
    logger.warning("Core routes unavailable: %s", _routes_error)
# ── Config ────────────────────────────────────────────────────────
PROJECT_ROOT      = Path(__file__).resolve().parents[2]
MODEL_VERSION     = os.getenv("MODEL_VER", "ensemble-v3.0-pytorch")
AI_MODEL_REQUIRED = os.getenv("AI_MODEL_REQUIRED", "0") == "1"
_RAW_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
)
ALLOWED_ORIGINS = [o.strip() for o in _RAW_ORIGINS.split(",")]
# =====================================================================
# LIFESPAN
# =====================================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=" * 60)
    logger.info("SADAR API starting …")
    logger.info("CORS origins : %s", ALLOWED_ORIGINS)
    logger.info("=" * 60)
    app.state.model         = None
    app.state.model_version = MODEL_VERSION
    try:
        from src.ai_model.model_loader import load_ensemble
        load_ensemble()
        app.state.model         = True
        app.state.model_version = "ensemble-v3.0-pytorch"
        logger.info("✅ PyTorch Ensemble loaded successfully!")
    except Exception as exc:
        logger.warning("Model unavailable: %s", exc)
        app.state.model = None
        if AI_MODEL_REQUIRED:
            raise
    logger.info("SADAR API ready ✅")
    yield
    logger.info("SADAR API shutting down …")
    app.state.model = None
# =====================================================================
# APP
# =====================================================================
app = FastAPI(
    title="SADAR Spectrum Detection API",
    description="Real-time RF signal classification — Drone / Jamming / Normal",
    version=MODEL_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)
# =====================================================================
# MIDDLEWARE
# =====================================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)
app.add_middleware(LoggingMiddleware)
# =====================================================================
# ROUTERS
# =====================================================================
app.include_router(router,       prefix="/api/v1")
app.include_router(agent_router, prefix="/api/v1")
app.include_router(mock_router,  prefix="/api/v1")   # ← سطر جديد
app.include_router(ws_router)
# =====================================================================
# ROOT
# =====================================================================
@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "SADAR API is running.",
        "docs":    "/docs",
        "ws":      "ws://localhost:8000/ws/alerts",
    }
# =====================================================================
# DEV ENTRY
# =====================================================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )