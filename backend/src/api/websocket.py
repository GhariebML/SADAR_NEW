"""
src/api/websocket.py
WebSocket manager for real-time alerts broadcast
"""

import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger("spectrum.websocket")

ws_router = APIRouter()

# قائمة الـ clients المتصلين
_connections: list[WebSocket] = []


async def broadcast_alert(data: dict) -> None:
    """يبعت message لكل الـ clients المتصلين"""
    import json
    disconnected = []
    for ws in _connections:
        try:
            await ws.send_text(json.dumps(data))
        except Exception:
            disconnected.append(ws)
    for ws in disconnected:
        try:
            _connections.remove(ws)
        except ValueError:
            pass


@ws_router.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    await websocket.accept()
    _connections.append(websocket)
    logger.info(f"✅ WebSocket connected — {len(_connections)} clients")
    try:
        while True:
            # نستنى أي message من الـ client (keep-alive)
            await websocket.receive_text()
    except WebSocketDisconnect:
        try:
            _connections.remove(websocket)
        except ValueError:
            pass
        logger.info(f"❌ WebSocket disconnected — {len(_connections)} clients")