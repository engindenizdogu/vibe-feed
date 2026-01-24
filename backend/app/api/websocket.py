import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import redis.asyncio as redis

from ..core.config import get_settings
from ..services.generation import get_redis

router = APIRouter()


@router.websocket("/ws/generation/{job_id}")
async def generation_websocket(websocket: WebSocket, job_id: str):
    """WebSocket endpoint for real-time generation updates."""
    await websocket.accept()

    r = await get_redis()
    pubsub = r.pubsub()

    try:
        # Subscribe to job updates
        await pubsub.subscribe(f"job_updates:{job_id}")

        # Send current status if job exists
        job_data = await r.hgetall(f"job:{job_id}")
        if job_data:
            status = job_data.get(b"status", b"pending").decode()
            if status == "completed":
                await websocket.send_json(
                    {
                        "type": "completed",
                        "app_id": job_data.get(b"app_id", b"").decode(),
                        "live_url": job_data.get(b"live_url", b"").decode(),
                        "thumbnail_url": job_data.get(b"thumbnail_url", b"").decode() or None,
                    }
                )
                return
            elif status == "failed":
                await websocket.send_json(
                    {
                        "type": "failed",
                        "error_code": job_data.get(b"error_code", b"").decode(),
                        "error_message": job_data.get(b"error_message", b"").decode(),
                    }
                )
                return
            else:
                # Send current progress
                await websocket.send_json(
                    {
                        "type": "status_update",
                        "step": job_data.get(b"step", b"").decode() or None,
                        "percent": int(job_data.get(b"percent", b"0").decode()),
                        "message": job_data.get(b"message", b"").decode() or None,
                    }
                )

        # Listen for updates
        while True:
            try:
                message = await asyncio.wait_for(
                    pubsub.get_message(ignore_subscribe_messages=True, timeout=30),
                    timeout=35,
                )

                if message and message["type"] == "message":
                    data = json.loads(message["data"])
                    await websocket.send_json(data)

                    # Close connection on completion or failure
                    if data.get("type") in ("completed", "failed"):
                        break

                # Send heartbeat ping
                await websocket.send_json({"type": "ping"})

            except asyncio.TimeoutError:
                # Send ping to keep connection alive
                try:
                    await websocket.send_json({"type": "ping"})
                except Exception:
                    break

    except WebSocketDisconnect:
        pass
    finally:
        await pubsub.unsubscribe(f"job_updates:{job_id}")
        await pubsub.close()
