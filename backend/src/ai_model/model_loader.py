"""
model_loader.py
---------------
تحميل الـ Ensemble النهائي (EfficientNetV2-S + ConvNeXt-Small + MaxViT-Tiny)
مع Open Set Detection و Smart Alert System

الموديلات مبنية بـ PyTorch + timm
✅ تمت مراجعته ليكون آمناً ومقاوماً للانهيار عند عدم توفر المكتبات أو ملفات الأوزان
"""

import json
import os
import logging
from pathlib import Path

logger = logging.getLogger("spectrum.loader")

# ── محاولة تحميل PyTorch و timm بأمان ──
try:
    import torch
    import torch.nn.functional as F
    import timm
    HAS_TORCH_AND_TIMM = True
except ImportError as e:
    logger.warning("⚠️  PyTorch or timm packages not available — activating rule-based AI fallback: %s", e)
    HAS_TORCH_AND_TIMM = False

# ============================================
# CONFIG
# ============================================
CLASSES      = ['Drone', 'Jamming', 'Normal']
NUM_CLASSES  = 3
IMG_SIZE     = 224

MODELS_CONFIG = [
    {
        "name":  "EfficientNetV2-S",
        "timm":  "tf_efficientnetv2_s",
        "file":  "best_efficientnet_final.pth",
    },
    {
        "name":  "ConvNeXt-Small",
        "timm":  "convnext_small.in12k_ft_in1k",
        "file":  "best_convnext_final.pth",
    },
    {
        "name":  "MaxViT-Tiny",
        "timm":  "maxvit_tiny_tf_224.in1k",
        "file":  "best_maxvit_final.pth",
    },
]

# ============================================
# SINGLETON — يتحمل مرة واحدة بس
# ============================================
_models          = None
_weights         = None
_energy_threshold = None
_device          = None
_fallback_active = False


def _get_saved_models_dir():
    """مسار مجلد الموديلات"""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(current_dir, "saved_models")


def is_fallback_active() -> bool:
    """هل الموديل شغال بوضع المحاكي البديل؟"""
    global _fallback_active
    return _fallback_active or not HAS_TORCH_AND_TIMM


def load_ensemble(saved_models_dir=None, device=None):
    """
    تحميل الـ Ensemble كامل بأمان
    لو تعذر تحميل PyTorch أو الملفات، يفعل وضع المحاكي التلقائي بدون انهيار السيرفر
    """
    global _models, _weights, _energy_threshold, _device, _fallback_active

    # لو تم التحميل مسبقاً، رجع النتيجة
    if _models is not None:
        return _models, _weights, _energy_threshold, _device

    if saved_models_dir is None:
        saved_models_dir = _get_saved_models_dir()

    # ── تحميل الأوزان والـ threshold من ملفات JSON ──
    results_path = os.path.join(saved_models_dir, "final_results.json")
    ensemble_path = os.path.join(saved_models_dir, "ensemble_weights_final.json")

    # Energy threshold
    _energy_threshold = -1.70  # default
    try:
        if os.path.exists(results_path):
            with open(results_path, 'r') as f:
                results = json.load(f)
            _energy_threshold = results.get("energy_threshold", -1.70)
    except Exception as e:
        logger.warning("Could not load threshold JSON: %s", e)

    # Ensemble weights
    _weights = {cfg["name"]: 1/3 for cfg in MODELS_CONFIG}  # default
    try:
        if os.path.exists(ensemble_path):
            with open(ensemble_path, 'r') as f:
                ens_data = json.load(f)
            if "weights" in ens_data:
                _weights = ens_data["weights"]
    except Exception as e:
        logger.warning("Could not load weights JSON: %s", e)

    # ── التحقق من توفر المكتبات ──
    if not HAS_TORCH_AND_TIMM:
        _fallback_active = True
        _models = []
        _device = 'cpu'
        logger.warning("🔄 Rule-based AI predictor loaded successfully (fallback mode)")
        return None, _weights, _energy_threshold, _device

    if device is None:
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
    _device = device

    logger.info("📦 Loading PyTorch ensemble on %s...", device.upper())

    # ── تحميل ملفات النماذج ──
    _models = []
    try:
        for cfg in MODELS_CONFIG:
            weights_path = os.path.join(saved_models_dir, cfg["file"])

            if not os.path.exists(weights_path) or os.path.getsize(weights_path) <= 10:
                logger.warning("⚠️ Weight file %s missing or placeholder — activating fallback", cfg["file"])
                _fallback_active = True
                _models = []
                return None, _weights, _energy_threshold, _device

            model = timm.create_model(cfg["timm"], pretrained=False, num_classes=NUM_CLASSES)
            state = torch.load(weights_path, map_location='cpu')
            model.load_state_dict(state, strict=True)
            model = model.to(device).eval()
            _models.append(model)
            logger.info("  ✅ Loaded: %s", cfg["name"])

        logger.info("🎯 Energy threshold: %.4f", _energy_threshold)
        logger.info("✅ PyTorch Ensemble loaded successfully!")
    except Exception as exc:
        logger.warning("⚠️ Failed loading PyTorch models: %s — using rule-based predictor", exc)
        _fallback_active = True
        _models = []
        return None, _weights, _energy_threshold, _device

    return _models, _weights, _energy_threshold, _device


def get_ensemble():
    """إرجاع الـ ensemble (يحمّله لو مش محمّل)"""
    return load_ensemble()


if __name__ == "__main__":
    print("=" * 55)
    print("📦 SADAR — Safe Model Loader")
    print("=" * 55)
    models, weights, threshold, device = load_ensemble()
    print(f"Fallback active: {is_fallback_active()}")