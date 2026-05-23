# SADAR (نظام رصد إشارات الطيف الترددي) 📡

[![UI/UX](https://img.shields.io/badge/UI%2FUX-Cyber--Glow-3291ff.svg)](https://reactjs.org/)
[![Backend](https://img.shields.io/badge/Backend-FastAPI-17c964.svg)](https://fastapi.tiangolo.com/)
[![License](https://img.shields.io/badge/License-MIT-e5484d.svg)](LICENSE)

SADAR is a high-fidelity, real-time Radio Frequency (RF) signal monitoring and analysis dashboard. Designed with an ultra-professional, military-grade "Cyber-Glow" aesthetic, it specializes in the real-time detection, classification, and tracking of **Drones**, **Active Jamming**, and **Normal** RF signals.

## 🚀 Key Features

*   **Real-time Telemetry (المراقبة اللحظية):** Ingests and visualizes high-frequency RF pulse data with zero perceivable latency using WebSockets.
*   **AI Co-Pilot Agent (المساعد الذكي):** Features an integrated, context-aware AI assistant capable of analyzing signal logs, generating tactical reports, and simulating RAG (Retrieval-Augmented Generation) responses even when offline.
*   **Cyber-Glow UI/UX:** An immersive dark-mode interface with frosted glassmorphism, dynamic radar sweep animations, and a sophisticated Vercel-inspired color palette.
*   **Native RTL Support:** Built from the ground up for Arabic language right-to-left layout perfection.
*   **Resilient Architecture:** The backend features a robust fallback layer that automatically drops down to rule-based simulation if heavy PyTorch dependencies or Ollama LLMs are unavailable, ensuring the UI never crashes.

## 🛠️ Technology Stack

**Frontend**
*   React 18 & TypeScript
*   Vite
*   TailwindCSS (Custom Cyberpunk Theme)
*   Recharts (Dynamic Data Visualization)
*   Zustand (Global State Management)

**Backend**
*   FastAPI (Python 3)
*   WebSockets (Real-time data streaming)
*   SQLite (RAG knowledge base simulation)
*   Uvicorn

## ⚙️ Getting Started

### Prerequisites
*   Node.js (v18+)
*   Python (3.9+)

### Installation & Execution

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/GhariebML/SADAR_NEW.git
    cd SADAR_NEW
    ```

2.  **Start the Backend (FastAPI):**
    ```bash
    cd backend
    pip install -r src/api/requirements.txt
    python -m uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload
    ```

3.  **Start the Frontend (React/Vite):**
    ```bash
    # Open a new terminal
    cd frontend
    npm install
    npm run dev
    ```

4.  **Access the Dashboard:**
    Open your browser and navigate to `http://localhost:5173`.

## 🛡️ License

This project is licensed under the MIT License.
