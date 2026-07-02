"""
SADAR — Professional Spectrum Anomaly Detection Simulation v9.0
- Full English Localization
- Enhanced Premium Terminal UI Design (Cyber-Security Cyberpunk Theme)
- Live Spectrum sweep sparkline & active log feed
- Gaussian confidence & realistic frequency ranges
"""

import time
import random
import sys
from datetime import datetime
import requests
import numpy as np

from rich.console import Console
from rich.layout import Layout
from rich.panel import Panel
from rich.table import Table
from rich.live import Live
from rich.text import Text
from rich.align import Align
from rich.box import ROUNDED, HEAVY_EDGE

# API Configuration
API_URL = "http://localhost:8000/api/v1/mock-signal"

# Signal weights and Gaussian confidence distributions
SIGNAL_WEIGHTS = {
    "Normal":  0.60,
    "Drone":   0.25,
    "Jamming": 0.15,
}

CONFIDENCE_DIST = {
    "Normal":  {"mean": 0.80, "std": 0.10, "min": 0.50, "max": 0.92},
    "Drone":   {"mean": 0.70, "std": 0.12, "min": 0.50, "max": 0.90},
    "Jamming": {"mean": 0.72, "std": 0.11, "min": 0.50, "max": 0.90},
}

ALERT_THRESHOLD = 0.75

FREQ_RANGES = {
    "Drone":   [(433.0, 435.0), (915.0, 916.0), (2400.0, 2483.0)],
    "Jamming": [(900.0, 960.0), (1800.0, 1900.0), (2100.0, 2200.0)],
    "Normal":  [(88.0,  108.0), (144.0,  148.0), (430.0,   440.0)],
}

LOCATIONS = [
    {"name": "Cairo",               "lat": 30.0444, "lng": 31.2357},
    {"name": "Giza",                "lat": 29.9870, "lng": 31.2118},
    {"name": "Shubra El-Kheima",    "lat": 30.0720, "lng": 31.2500},
    {"name": "Helwan",              "lat": 29.8500, "lng": 31.3333},
    {"name": "6th of October",      "lat": 29.9361, "lng": 31.0333},
    {"name": "El Obour",            "lat": 30.1333, "lng": 31.4500},
    {"name": "Badr City",           "lat": 30.1333, "lng": 31.7167},
    {"name": "New Cairo",           "lat": 30.0167, "lng": 31.4667},
    {"name": "Madinaty",            "lat": 30.0833, "lng": 31.5333},
    {"name": "El Shorouk",          "lat": 30.1167, "lng": 31.6000},
]

DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]

# State tracking for Dashboard
stats = {
    "total": 0,
    "normal": 0,
    "drone": 0,
    "jamming": 0,
    "alerts": 0,
    "last_status": "Starting...",
    "avg_snr": 0.0,
    "avg_strength": 0.0,
}

signal_history = []
snr_history = []
strength_history = []
log_history = []  # Last 4 console log lines

def add_log(msg: str):
    timestamp = datetime.now().strftime("%H:%M:%S")
    log_history.append(f"[{timestamp}] {msg}")
    if len(log_history) > 4:
        log_history.pop(0)

def get_confidence(sig_type: str) -> float:
    d = CONFIDENCE_DIST[sig_type]
    val = np.random.normal(d["mean"], d["std"])
    val = max(d["min"], min(d["max"], val))
    return round(float(val), 4)

def generate_header() -> Panel:
    grid = Table.grid(expand=True)
    grid.add_column(justify="left", ratio=1)
    grid.add_column(justify="right", ratio=1)
    
    title = Text.from_markup("🛸 [bold magenta]SADAR[/] [bold white]— SPECTRUM ANOMALY DETECTOR[/] [dim]v9.0[/]")
    status_text = Text.from_markup(
        "[bold green]● SCANNING FREQUENCIES[/] | [bold cyan]Cairo/SDR-1[/] | API: [cyan]Active[/]"
    )
    
    grid.add_row(title, status_text)
    return Panel(grid, style="bold cyan", border_style="cyan", box=ROUNDED)

def generate_stats_panel() -> Panel:
    table = Table.grid(padding=(0, 1, 0, 1))
    table.add_column(style="bold white", width=22)
    table.add_column(style="cyan", justify="right")
    
    table.add_row("Total Packets:", f"{stats['total']}")
    table.add_row("Normal Signals:", f"[green]{stats['normal']}[/]")
    table.add_row("Drone Signatures:", f"[red]{stats['drone']}[/]")
    table.add_row("Jamming Signatures:", f"[yellow]{stats['jamming']}[/]")
    table.add_row("Triggered Alerts:", f"[bold red]{stats['alerts']}[/]")
    table.add_row("─" * 20, "─" * 6)
    table.add_row("Mean SNR:", f"{stats['avg_snr']:.1f} dB")
    table.add_row("Mean Strength:", f"{stats['avg_strength']:.1f} dBm")
    table.add_row("API Gateway Status:", f"{stats['last_status']}")
    
    return Panel(table, title="[bold cyan]System Metrics[/bold cyan]", border_style="cyan", box=ROUNDED)

def generate_visual_panel() -> Panel:
    # Generates a dynamic spectrum sweep graph
    blocks = [" ", "▂", "▃", "▄", "▅", "▆", "▇", "█"]
    line_len = 28
    
    # Create a nice wave representation with active drone/jamming spike simulation
    bars = []
    for i in range(line_len):
        h = random.randint(1, 4)
        # simulate noise or signals
        if stats["total"] % 5 == 0 and 10 < i < 15:
            h = random.randint(6, 7) # high spike
        bars.append(blocks[h])
    
    wave = "".join(bars)
    
    content = Table.grid()
    content.add_column()
    content.add_row(Text.from_markup(f"[bold magenta]Spectrum Sweep:[/] [cyan]{wave}[/]"))
    content.add_row(Text.from_markup(f"[bold magenta]RF Activity:[/]    [green]████████░░░░░░░░ 52%[/]"))
    
    return Panel(content, title="[bold magenta]Spectral Analysis[/bold magenta]", border_style="magenta", box=ROUNDED)

def generate_logs_panel() -> Panel:
    content = Table.grid()
    content.add_column()
    
    if not log_history:
        content.add_row(Text("Listening for signals...", style="dim italic"))
    else:
        for log in log_history:
            content.add_row(Text.from_markup(log))
            
    return Panel(content, title="[bold yellow]System Event Logs[/bold yellow]", border_style="yellow", box=ROUNDED)

def generate_signals_table() -> Panel:
    table = Table(box=ROUNDED, expand=True, border_style="cyan")
    table.add_column("Pkt #", justify="center", width=6, style="dim")
    table.add_column("Timestamp", justify="center", width=12)
    table.add_column("Classification", justify="center", width=16)
    table.add_column("Frequency", justify="right", width=14)
    table.add_column("SNR (dB)", justify="right", width=10)
    table.add_column("Power (dBm)", justify="right", width=13)
    table.add_column("Heading", justify="center", width=9)
    table.add_column("Station Location", justify="center", width=18)
    table.add_column("System Alert", justify="center")
    
    # Display last 10 signals
    for idx, sig in enumerate(reversed(signal_history[-10:])):
        counter_str = f"#{len(signal_history) - idx:04d}"
        
        lbl = sig["label"]
        if lbl == "Normal":
            type_markup = f"[bold green]🟢 Normal[/]"
        elif lbl == "Drone":
            type_markup = f"[bold red]🚨 Drone[/]"
        else:
            type_markup = f"[bold yellow]📡 Jamming[/]"
            
        status_markup = "[green]OK[/]"
        if sig["is_alert"]:
            status_markup = "[blink bold red]CRITICAL ALERT[/]"
            
        table.add_row(
            counter_str,
            sig["time"],
            type_markup,
            f"{sig['frequency']:.2f} MHz",
            f"{sig['snr']:.1f}",
            f"{sig['strength']:.1f}",
            sig["direction"],
            sig["location"],
            status_markup
        )
        
    return Panel(table, title="[bold cyan]Live RF Signal Feed (Last 10 Events)[/bold cyan]", border_style="cyan", box=HEAVY_EDGE)

def make_layout() -> Layout:
    layout = Layout()
    layout.split_column(
        Layout(name="header", size=3),
        Layout(name="body")
    )
    layout["body"].split_row(
        Layout(name="left_sidebar", size=32),
        Layout(name="table_area")
    )
    layout["left_sidebar"].split_column(
        Layout(name="stats", size=11),
        Layout(name="visuals", size=4),
        Layout(name="logs")
    )
    return layout

def main():
    # Initial setup
    layout = make_layout()
    add_log("[info] Initialized SADAR Spectrum Scanner SDR-1...")
    add_log("[info] Ready to connect to FastAPI endpoint...")
    
    with Live(layout, refresh_per_second=4, screen=True) as live:
        while True:
            stats["total"] += 1
            
            sig_type = random.choices(
                list(SIGNAL_WEIGHTS.keys()),
                weights=list(SIGNAL_WEIGHTS.values()),
                k=1
            )[0]
            
            confidence = get_confidence(sig_type)
            is_alert = sig_type in ("Drone", "Jamming") and confidence >= ALERT_THRESHOLD
            
            # Record stat
            if sig_type == "Normal":
                stats["normal"] += 1
            elif sig_type == "Drone":
                stats["drone"] += 1
            else:
                stats["jamming"] += 1
                
            if is_alert:
                stats["alerts"] += 1
                
            # Stats & math
            low, high = random.choice(FREQ_RANGES[sig_type])
            frequency = round(random.uniform(low, high), 2)
            snr = round(random.uniform(5.0, 30.0), 2)
            strength = round(random.uniform(-90.0, -30.0), 2)
            direction = random.choice(DIRECTIONS)
            location = random.choice(LOCATIONS)
            
            snr_history.append(snr)
            strength_history.append(strength)
            stats["avg_snr"] = np.mean(snr_history[-50:])
            stats["avg_strength"] = np.mean(strength_history[-50:])
            
            sig_data = {
                "label": sig_type,
                "confidence": confidence,
                "frequency": frequency,
                "snr": snr,
                "strength": strength,
                "direction": direction,
                "location": location["name"],
                "is_alert": is_alert,
                "time": datetime.now().strftime("%H:%M:%S")
            }
            signal_history.append(sig_data)
            
            # Log message local
            if sig_type == "Normal":
                add_log(f"[green]Logged {sig_type} signal ({frequency:.1f} MHz)[/]")
            elif is_alert:
                add_log(f"[bold red]CRITICAL: Detected {sig_type} alert ({frequency:.1f} MHz)! [/]")
            else:
                add_log(f"[yellow]Warn: Low confidence {sig_type} ({frequency:.1f} MHz)[/]")
                
            # Send API Post
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
                r = requests.post(API_URL, json=payload, timeout=2)
                if r.status_code == 200:
                    data = r.json()
                    alert_info = "Alert" if data.get('alert_triggered') else "Logged"
                    stats["last_status"] = "[bold green]Connected[/bold green]"
                else:
                    stats["last_status"] = f"[bold yellow]HTTP {r.status_code}[/bold yellow]"
            except requests.exceptions.ConnectionError:
                stats["last_status"] = "[bold red]API Offline[/bold red]"
            except Exception as e:
                stats["last_status"] = "[bold red]Error[/bold red]"
                
            # Update UI Layout
            layout["header"].update(generate_header())
            layout["stats"].update(generate_stats_panel())
            layout["visuals"].update(generate_visual_panel())
            layout["logs"].update(generate_logs_panel())
            layout["table_area"].update(generate_signals_table())
            
            # Wait for next check (between 1.5 and 2.5 seconds)
            time.sleep(random.uniform(1.5, 2.5))

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        Console().clear()
        print("SADAR Scanner Stopped. Goodbye!")
        sys.exit(0)
