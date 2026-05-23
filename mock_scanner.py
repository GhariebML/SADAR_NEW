"""
SADAR — Mock Scanner v7.2
- الثقة توزيع طبيعي (Gaussian) من 50% → 90%
- الإنذار يشتغل بس لو conf >= 75%
- المحطة: القاهرة | المصدر: SDR-1
"""

import time
import random
import requests
import numpy as np

API_URL = "http://localhost:8000/api/v1/mock-signal"

SIGNAL_WEIGHTS = {
    "Normal":  0.60,
    "Drone":   0.25,
    "Jamming": 0.15,
}

# توزيع طبيعي لكل نوع — mean هو الأكثر تكراراً
# Normal: معظم الوقت حوالي 80%
# Drone:  معظم الوقت حوالي 70% (أحياناً فوق 75 وأحياناً تحت)
# Jamming: معظم الوقت حوالي 72%
CONFIDENCE_DIST = {
    "Normal":  {"mean": 0.80, "std": 0.10, "min": 0.50, "max": 0.92},
    "Drone":   {"mean": 0.70, "std": 0.12, "min": 0.50, "max": 0.90},
    "Jamming": {"mean": 0.72, "std": 0.11, "min": 0.50, "max": 0.90},
}

ALERT_THRESHOLD = 0.75   # الإنذار بيشتغل فوق 75% بس

FREQ_RANGES = {
    "Drone":   [(433.0, 435.0), (915.0, 916.0), (2400.0, 2483.0)],
    "Jamming": [(900.0, 960.0), (1800.0, 1900.0), (2100.0, 2200.0)],
    "Normal":  [(88.0,  108.0), (144.0,  148.0), (430.0,   440.0)],
}

# القاهرة الكبرى فقط
LOCATIONS = [
    {"name": "القاهرة",               "lat": 30.0444, "lng": 31.2357},
    {"name": "الجيزة",                "lat": 29.9870, "lng": 31.2118},
    {"name": "شبرا الخيمة",           "lat": 30.0720, "lng": 31.2500},
    {"name": "حلوان",                 "lat": 29.8500, "lng": 31.3333},
    {"name": "السادس من أكتوبر",      "lat": 29.9361, "lng": 31.0333},
    {"name": "العبور",                "lat": 30.1333, "lng": 31.4500},
    {"name": "مدينة بدر",             "lat": 30.1333, "lng": 31.7167},
    {"name": "القاهرة الجديدة",       "lat": 30.0167, "lng": 31.4667},
    {"name": "مدينتي",                "lat": 30.0833, "lng": 31.5333},
    {"name": "الشروق",                "lat": 30.1167, "lng": 31.6000},
]

DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]

CLR  = {"Normal": "\033[92m", "Drone": "\033[91m", "Jamming": "\033[93m", "reset": "\033[0m"}
ICON = {"Normal": "✅", "Drone": "🚁", "Jamming": "📡"}


def get_confidence(sig_type: str) -> float:
    """توزيع طبيعي Gaussian — أكثر واقعية من uniform"""
    d = CONFIDENCE_DIST[sig_type]
    val = np.random.normal(d["mean"], d["std"])
    val = max(d["min"], min(d["max"], val))   # clip
    return round(float(val), 4)


print("🚀 SADAR Mock Scanner v7.2")
print(f"   Endpoint  : {API_URL}")
print(f"   المحطة    : القاهرة | SDR-1")
print(f"   الثقة     : توزيع طبيعي 50%→90%")
print(f"   الإنذار   : Drone/Jamming + conf ≥ {ALERT_THRESHOLD*100:.0f}% فقط")
print(f"   Normal    : {SIGNAL_WEIGHTS['Normal']*100:.0f}% | "
      f"Drone: {SIGNAL_WEIGHTS['Drone']*100:.0f}% | "
      f"Jamming: {SIGNAL_WEIGHTS['Jamming']*100:.0f}%")
print("─" * 60)
print("Ctrl+C للإيقاف\n")

counter = 0

while True:
    counter += 1

    # اختيار النوع
    sig_type = random.choices(
        list(SIGNAL_WEIGHTS.keys()),
        weights=list(SIGNAL_WEIGHTS.values()),
        k=1
    )[0]

    # الثقة بتوزيع طبيعي
    confidence = get_confidence(sig_type)
    is_alert   = sig_type in ("Drone", "Jamming") and confidence >= ALERT_THRESHOLD

    # بيانات الإشارة
    low, high = random.choice(FREQ_RANGES[sig_type])
    frequency = round(random.uniform(low, high), 2)
    snr       = round(random.uniform(5.0, 30.0), 2)
    strength  = round(random.uniform(-90.0, -30.0), 2)
    direction = random.choice(DIRECTIONS)
    location  = random.choice(LOCATIONS)

    # طباعة
    col = CLR[sig_type]
    rst = CLR["reset"]
    alert_tag = f" 🚨 ALERT" if is_alert else f" (conf < {ALERT_THRESHOLD*100:.0f}% — no alert)" if sig_type != "Normal" else ""
    print(f"[{counter:04d}] {col}{ICON[sig_type]} {sig_type:8s}{rst} | "
          f"القاهرة/SDR-1 | {direction:2s} | "
          f"{frequency:8.2f} MHz | "
          f"conf={confidence*100:5.1f}%{alert_tag}")

    payload = {
        "label":      sig_type,
        "confidence": confidence,
        "frequency":  frequency,
        "snr":        snr,
        "strength":   strength,
        "direction":  direction,
        "location":   location["name"],
        "lat":        location["lat"],
        "lng":        location["lng"],
    }

    try:
        r = requests.post(API_URL, json=payload, timeout=10)
        if r.status_code == 200:
            data = r.json()
            print(f"       ✅ id={data.get('signal_id')} | "
                  f"station={data.get('station')} | "
                  f"source={data.get('source')} | "
                  f"alert={'🔴 YES — Gmail sent' if data.get('alert_triggered') else '🟢 no'}")
        else:
            print(f"       ⚠️  {r.status_code}: {r.text[:120]}")

    except requests.exceptions.ConnectionError:
        print("       ❌ السيرفر مش شغّال")
    except Exception as e:
        print(f"       ❌ {e}")

    print()
    time.sleep(random.uniform(1.5, 3.0))