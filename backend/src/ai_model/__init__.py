"""
src/ai_model/__init__.py
------------------------
Makes the ai_model directory a Python package.
"""
from .predict import predict_single, predict_batch
from .model_loader import load_ensemble, get_ensemble

__all__ = [
    "predict_single",
    "predict_batch",
    "load_ensemble",
    "get_ensemble",
]

__version__ = "3.0.0"
__author__ = "Goda Emad"