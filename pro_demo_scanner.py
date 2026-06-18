import time
import requests
import threading
import sys
from datetime import datetime, timezone
import random

API_URL = "http://localhost:8000/api/v1/mock-signal"

# Global state
attack_mode = None

def get_normal_signal():
    return {
        "label": "Normal",
        "confidence": round(random.uniform(0.5, 0.7), 2),
        "threat_score": random.randint(10, 30),
        "threat_level": "clear",
        "is_unknown": False,
        "energy_score": round(random.uniform(-10.0, -5.0), 2),
        "frequency": round(random.uniform(88.0, 108.0), 2),
        "snr": round(random.uniform(5.0, 15.0), 2),
        "strength": round(random.uniform(-90.0, -70.0), 2),
        "station": "Cairo Station",
        "direction": random.choice(["N", "NE", "E", "SE", "S", "SW", "W", "NW"]),
        "source": "SDR-1",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

def get_drone_signal():
    return {
        "label": "Drone",
        "confidence": round(random.uniform(0.95, 0.99), 2),
        "threat_score": random.randint(85, 98),
        "threat_level": "danger",
        "is_unknown": False,
        "energy_score": round(random.uniform(-2.0, 1.0), 2),
        "frequency": round(random.uniform(2400.0, 2483.0), 2),
        "snr": round(random.uniform(15.0, 30.0), 2),
        "strength": round(random.uniform(-50.0, -30.0), 2),
        "station": "Cairo Station",
        "direction": "NW",
        "source": "SDR-1",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

def get_jamming_signal():
    return {
        "label": "Jamming",
        "confidence": round(random.uniform(0.85, 0.95), 2),
        "threat_score": random.randint(75, 85),
        "threat_level": "warning",
        "is_unknown": False,
        "energy_score": round(random.uniform(-3.0, 0.0), 2),
        "frequency": round(random.uniform(900.0, 960.0), 2),
        "snr": round(random.uniform(10.0, 20.0), 2),
        "strength": round(random.uniform(-60.0, -40.0), 2),
        "station": "Cairo Station",
        "direction": "S",
        "source": "SDR-1",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

def get_unknown_signal():
    return {
        "label": "Unknown",
        "confidence": round(random.uniform(0.40, 0.60), 2),
        "threat_score": random.randint(40, 60),
        "threat_level": "unknown",
        "is_unknown": True,
        "energy_score": round(random.uniform(-5.0, -2.0), 2),
        "frequency": round(random.uniform(400.0, 500.0), 2),
        "snr": round(random.uniform(8.0, 12.0), 2),
        "strength": round(random.uniform(-70.0, -50.0), 2),
        "station": "Cairo Station",
        "direction": "E",
        "source": "SDR-1",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

def send_signal(sig):
    try:
        requests.post(API_URL, json=sig, timeout=2)
    except:
        pass

def background_worker():
    global attack_mode
    while True:
        if attack_mode == "drone":
            for _ in range(3):
                send_signal(get_drone_signal())
                time.sleep(1)
            attack_mode = None
        elif attack_mode == "jamming":
            for _ in range(3):
                send_signal(get_jamming_signal())
                time.sleep(1)
            attack_mode = None
        elif attack_mode == "unknown":
            for _ in range(2):
                send_signal(get_unknown_signal())
                time.sleep(1)
            attack_mode = None
        else:
            send_signal(get_normal_signal())
            time.sleep(3) # Send normal signal every 3 seconds

def main():
    global attack_mode
    print("="*60)
    print(" 🚀 SADAR Pro Demo Controller")
    print("="*60)
    print("This script continuously sends NORMAL (Green) signals in the background.")
    print("To perfectly sync the demo with your speech, press the following keys:")
    print("")
    print(" [1] or [Enter]  🚁 DRONE ATTACK -> Red Alert & Emails!")
    print(" [2]             📡 JAMMING ATTACK -> Yellow Alert")
    print(" [3]             ❓ UNKNOWN SIGNAL -> Open Set Detection")
    print(" [q]             ❌ QUIT")
    print("="*60)

    t = threading.Thread(target=background_worker, daemon=True)
    t.start()

    while True:
        cmd = input("Select Attack [1/2/3/q] (or Enter for Drone): ").strip().lower()
        if cmd == 'q':
            print("Exiting...")
            sys.exit(0)
        elif cmd in ['1', '']:
            print(">>> 🔴 DRONE ATTACK INITIATED!")
            attack_mode = "drone"
        elif cmd == '2':
            print(">>> 🟡 JAMMING ATTACK INITIATED!")
            attack_mode = "jamming"
        elif cmd == '3':
            print(">>> 🟣 UNKNOWN SIGNAL INITIATED!")
            attack_mode = "unknown"
        else:
            print("Unknown command. Use 1, 2, 3, or q.")

if __name__ == '__main__':
    main()
