import sys
import os
from datetime import datetime

# Setup paths so imports work
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.alerting.alert_dispatcher import dispatch_alert_sync

test_signal = {
    "label": "Drone",
    "confidence": 0.95,
    "threat_score": 90,
    "threat_level": "danger",
    "is_unknown": False,
    "energy_score": -2.1,
    "frequency": 2400.0,
    "snr": 18.5,
    "strength": -55.0,
    "station": "SADAR-HQ",
    "direction": "NW",
    "timestamp": datetime.utcnow().isoformat()
}

print("⚠️ جاري إطلاق تهديد وهمي (طائرة مسيرة)...")
dispatch_alert_sync(test_signal, channels=["gmail"])
print("✅ اكتملت العملية.")
