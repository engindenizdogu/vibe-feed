"""
Worker for processing app generation jobs from the Redis queue.
Uses CrewAI agents for code generation and Daytona for deployment.
"""

import asyncio
import json
from typing import Optional

import redis.asyncio as redis
from supabase import create_client, Client

from ..core.config import get_settings
from .agents import analyze_vibe, generate_code
from .daytona_manager import daytona_manager
from .generation import update_job_status, mark_job_completed, mark_job_failed

settings = get_settings()


def get_supabase() -> Client:
    """Get Supabase client for database operations."""
    return create_client(settings.supabase_url, settings.supabase_service_key)


async def process_generation_job(job_id: str, app_id: str, prompt: str, user_id: str) -> None:
    """
    Process a single generation job.

    Flow:
    1. Analyze vibe with AI
    2. Generate code with AI
    3. Deploy to Daytona
    4. Update database with results
    """
    supabase = get_supabase()

    try:
        # Step 1: Analyze vibe
        print(f"\n[Job {job_id}] Analyzing vibe for: '{prompt[:50]}...'")
        await update_job_status(
            job_id,
            status="analyzing",
            step="analyzing",
            percent=10,
            message="Analyzing your creative vision..."
        )

        # Update app status in database
        supabase.table("apps").update({"status": "analyzing"}).eq("id", app_id).execute()

        # Run vibe analysis (this is synchronous, run in executor)
        loop = asyncio.get_event_loop()
        vibe_analysis = await loop.run_in_executor(None, analyze_vibe, prompt)
        print(f"[Job {job_id}] Vibe analyzed: {vibe_analysis.get('title')}")

        # Step 2: Generate code
        print(f"[Job {job_id}] Generating code...")
        await update_job_status(
            job_id,
            status="generating",
            step="generating",
            percent=40,
            message="Creating your generative art code..."
        )

        supabase.table("apps").update({"status": "generating"}).eq("id", app_id).execute()

        # Run code generation (synchronous, run in executor)
        code_files = await loop.run_in_executor(
            None,
            generate_code,
            vibe_analysis,
            prompt
        )
        print(f"[Job {job_id}] Code generated ({len(code_files)} files)")

        # Step 3: Deploy to Daytona
        print(f"[Job {job_id}] Deploying to Daytona...")
        await update_job_status(
            job_id,
            status="deploying",
            step="deploying",
            percent=70,
            message="Deploying your app to the cloud..."
        )

        supabase.table("apps").update({"status": "deploying"}).eq("id", app_id).execute()

        # Deploy (synchronous, run in executor)
        deployment = await loop.run_in_executor(
            None,
            daytona_manager.deploy_flask_app,
            vibe_analysis.get("title", "vibe-app"),
            code_files
        )
        print(f"[Job {job_id}] Deployed: {deployment['url']}")

        # Step 4: Update database with results
        print(f"[Job {job_id}] Saving to database...")

        # Get title from vibe analysis or generate from prompt
        title = vibe_analysis.get("title", prompt[:50])
        description = vibe_analysis.get("description", prompt[:200])
        tags = vibe_analysis.get("tags", [])

        supabase.table("apps").update({
            "status": "live",
            "title": title,
            "description": description,
            "live_url": deployment["url"],
            "daytona_workspace_id": deployment["workspace_id"],
            # Store vibe analysis as metadata (if you have a metadata column)
            # "metadata": json.dumps(vibe_analysis),
        }).eq("id", app_id).execute()

        # Mark job as completed
        await mark_job_completed(
            job_id=job_id,
            app_id=app_id,
            live_url=deployment["url"],
            thumbnail_url=None  # TODO: Generate thumbnails
        )

        print(f"[Job {job_id}] Completed successfully!")

    except Exception as e:
        print(f"[Job {job_id}] Error: {e}")

        # Update app status to failed
        supabase.table("apps").update({
            "status": "failed",
        }).eq("id", app_id).execute()

        # Mark job as failed
        await mark_job_failed(
            job_id=job_id,
            error_code="GENERATION_ERROR",
            error_message=str(e)
        )


async def worker_loop():
    """Main worker loop that processes jobs from the Redis queue."""
    print("Starting generation worker...")

    r = redis.from_url(settings.redis_url)

    while True:
        try:
            # Block waiting for a job (timeout after 5 seconds to allow graceful shutdown)
            result = await r.brpop("generation_queue", timeout=5)

            if result is None:
                continue

            _, job_id_bytes = result
            job_id = job_id_bytes.decode()

            print(f"Processing job: {job_id}")

            # Get job data
            job_data = await r.hgetall(f"job:{job_id}")
            if not job_data:
                print(f"Job {job_id} not found, skipping")
                continue

            job = {k.decode(): v.decode() for k, v in job_data.items()}

            # Process the job
            await process_generation_job(
                job_id=job_id,
                app_id=job["app_id"],
                prompt=job["prompt"],
                user_id=job["user_id"]
            )

        except asyncio.CancelledError:
            print("Worker shutdown requested")
            break
        except Exception as e:
            print(f"Worker error: {e}")
            await asyncio.sleep(1)  # Brief pause before retrying

    await r.close()
    print("Worker stopped")


def run_worker():
    """Entry point for running the worker."""
    asyncio.run(worker_loop())


if __name__ == "__main__":
    run_worker()
