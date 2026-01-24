import asyncio
import json
from typing import Any, Callable

import redis.asyncio as redis

from ..core.config import get_settings

settings = get_settings()

# Redis client for job queue
redis_client: redis.Redis | None = None


async def get_redis() -> redis.Redis:
    global redis_client
    if redis_client is None:
        redis_client = redis.from_url(settings.redis_url)
    return redis_client


async def queue_generation_job(
    job_id: str,
    app_id: str,
    prompt: str,
    user_id: str,
) -> None:
    """Queue a generation job for processing."""
    r = await get_redis()

    job_data = {
        "job_id": job_id,
        "app_id": app_id,
        "prompt": prompt,
        "user_id": user_id,
        "status": "pending",
    }

    # Store job data
    await r.hset(f"job:{job_id}", mapping=job_data)
    await r.expire(f"job:{job_id}", 3600)  # 1 hour TTL

    # Add to queue
    await r.lpush("generation_queue", job_id)


async def get_job_status(job_id: str) -> dict | None:
    """Get the current status of a job."""
    r = await get_redis()
    job_data = await r.hgetall(f"job:{job_id}")

    if not job_data:
        return None

    return {k.decode(): v.decode() for k, v in job_data.items()}


async def update_job_status(
    job_id: str,
    status: str,
    step: str | None = None,
    percent: int | None = None,
    message: str | None = None,
    **extra: Any,
) -> None:
    """Update job status and publish to subscribers."""
    r = await get_redis()

    update_data = {"status": status}
    if step:
        update_data["step"] = step
    if percent is not None:
        update_data["percent"] = str(percent)
    if message:
        update_data["message"] = message

    await r.hset(f"job:{job_id}", mapping=update_data)

    # Publish update to WebSocket subscribers
    update_message = {
        "type": "status_update" if status not in ("completed", "failed") else status,
        "step": step,
        "percent": percent,
        "message": message,
        **extra,
    }
    await r.publish(f"job_updates:{job_id}", json.dumps(update_message))


async def mark_job_completed(
    job_id: str,
    app_id: str,
    live_url: str,
    thumbnail_url: str | None = None,
) -> None:
    """Mark a job as completed."""
    r = await get_redis()

    await r.hset(
        f"job:{job_id}",
        mapping={
            "status": "completed",
            "live_url": live_url,
            "thumbnail_url": thumbnail_url or "",
        },
    )

    # Publish completion
    await r.publish(
        f"job_updates:{job_id}",
        json.dumps(
            {
                "type": "completed",
                "app_id": app_id,
                "live_url": live_url,
                "thumbnail_url": thumbnail_url,
            }
        ),
    )


async def mark_job_failed(job_id: str, error_code: str, error_message: str) -> None:
    """Mark a job as failed."""
    r = await get_redis()

    await r.hset(
        f"job:{job_id}",
        mapping={
            "status": "failed",
            "error_code": error_code,
            "error_message": error_message,
        },
    )

    # Publish failure
    await r.publish(
        f"job_updates:{job_id}",
        json.dumps(
            {
                "type": "failed",
                "error_code": error_code,
                "error_message": error_message,
            }
        ),
    )
