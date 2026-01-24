"""
Worker for processing generation jobs using the Two-Agent Architecture.

Architecture:
1. Project Manager Agent (runs here) - Orchestrates the generation
2. Developer Agent (runs in Daytona sandbox) - Executes code

Flow:
1. User submits prompt
2. Project Manager analyzes and delegates to Developer Agent
3. Developer Agent creates app in sandbox
4. Project Manager reviews and requests fixes if needed
5. App is deployed and preview URL is returned
"""

import asyncio
import traceback

from supabase import create_client

from ..core.config import get_settings
from ..services.generation import (
    get_redis,
    get_job_status,
    update_job_status,
    mark_job_completed,
    mark_job_failed,
)
from .project_manager import ProjectManagerAgent
from .daytona_sandbox import DaytonaSandboxManager


async def process_job(job_id: str) -> None:
    """Process a single generation job using the two-agent architecture."""
    settings = get_settings()
    supabase = create_client(settings.supabase_url, settings.supabase_service_key)
    sandbox_manager = None

    try:
        # Get job data
        job = await get_job_status(job_id)
        if not job:
            print(f"Job {job_id} not found")
            return

        app_id = job["app_id"]
        prompt = job["prompt"]

        print(f"Processing job {job_id} for app {app_id}")

        # Step 1: Content moderation
        await update_job_status(
            job_id,
            status="processing",
            step="moderation",
            percent=5,
            message="Checking content...",
        )

        # Update app status
        supabase.table("apps").update({"status": "analyzing"}).eq("id", app_id).execute()

        # Simple keyword-based moderation (replace with actual moderation API)
        blocked_keywords = ["hack", "exploit", "malware", "phishing", "illegal"]
        prompt_lower = prompt.lower()
        for keyword in blocked_keywords:
            if keyword in prompt_lower:
                await mark_job_failed(
                    job_id,
                    error_code="CONTENT_BLOCKED",
                    error_message="Your prompt contains content that violates our guidelines.",
                )
                supabase.table("apps").update({"status": "failed"}).eq("id", app_id).execute()
                return

        await update_job_status(
            job_id,
            status="processing",
            step="moderation",
            percent=10,
            message="Content approved",
        )

        # Step 2: Create Daytona sandbox
        await update_job_status(
            job_id,
            status="processing",
            step="analyzing",
            percent=15,
            message="Setting up development environment...",
        )

        sandbox_manager = DaytonaSandboxManager()
        preview_url = sandbox_manager.create_sandbox()

        await update_job_status(
            job_id,
            status="processing",
            step="analyzing",
            percent=25,
            message="Developer Agent ready",
        )

        # Step 3: Initialize Project Manager and run generation
        supabase.table("apps").update({"status": "generating"}).eq("id", app_id).execute()

        project_manager = ProjectManagerAgent(settings.anthropic_api_key)

        async def on_progress(step: str, percent: int, message: str):
            await update_job_status(job_id, status="processing", step=step, percent=percent, message=message)

        # Run the two-agent generation process
        live_url, full_output = await project_manager.process_request(
            user_prompt=prompt,
            run_developer_task=sandbox_manager.run_developer_task,
            on_progress=on_progress,
        )

        if not live_url:
            # Fallback to sandbox preview URL if not extracted
            live_url = preview_url

        # Step 4: Update app with deployment info
        supabase.table("apps").update({"status": "deploying"}).eq("id", app_id).execute()

        await update_job_status(
            job_id,
            status="processing",
            step="deploying",
            percent=90,
            message="Finalizing deployment...",
        )

        # Store the generation output and live URL
        supabase.table("apps").update(
            {
                "status": "live",
                "live_url": live_url,
                "daytona_workspace_id": sandbox_manager.sandbox.id if sandbox_manager.sandbox else None,
            }
        ).eq("id", app_id).execute()

        # Mark as completed
        await mark_job_completed(
            job_id,
            app_id=app_id,
            live_url=live_url,
            thumbnail_url=None,
        )

        print(f"Job {job_id} completed successfully. App live at: {live_url}")

    except Exception as e:
        print(f"Job {job_id} failed: {e}")
        traceback.print_exc()

        # Mark job as failed
        await mark_job_failed(
            job_id,
            error_code="GENERATION_ERROR",
            error_message=str(e),
        )

        # Update app status
        try:
            job = await get_job_status(job_id)
            if job:
                supabase.table("apps").update({"status": "failed"}).eq(
                    "id", job["app_id"]
                ).execute()
        except Exception:
            pass

    finally:
        # Clean up sandbox (but keep it running for the app)
        # Note: We don't delete the sandbox here because the app needs to stay live
        # Sandboxes will be cleaned up when apps are deleted or via scheduled cleanup
        pass


async def run_worker() -> None:
    """Main worker loop - processes jobs from the queue."""
    print("=" * 50)
    print("Starting Slop Feed Generation Worker")
    print("Two-Agent Architecture: Project Manager + Developer Agent")
    print("=" * 50)

    r = await get_redis()

    while True:
        try:
            # Block and wait for a job
            result = await r.brpop("generation_queue", timeout=30)

            if result:
                _, job_id = result
                job_id = job_id.decode()
                print(f"\n{'='*50}")
                print(f"New job received: {job_id}")
                print(f"{'='*50}")
                await process_job(job_id)

        except Exception as e:
            print(f"Worker error: {e}")
            traceback.print_exc()
            await asyncio.sleep(5)


if __name__ == "__main__":
    asyncio.run(run_worker())
