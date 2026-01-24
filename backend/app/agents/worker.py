"""Worker for processing generation jobs."""

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
from .prompt_analyzer import analyze_prompt
from .code_generator import generate_code
from .deploy_manager import deploy_to_daytona


async def process_job(job_id: str) -> None:
    """Process a single generation job."""
    settings = get_settings()
    supabase = create_client(settings.supabase_url, settings.supabase_service_key)

    try:
        # Get job data
        job = await get_job_status(job_id)
        if not job:
            print(f"Job {job_id} not found")
            return

        app_id = job["app_id"]
        prompt = job["prompt"]

        print(f"Processing job {job_id} for app {app_id}")

        # Step 1: Content moderation (placeholder - would use actual moderation API)
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

        # Step 2: Analyze prompt
        await update_job_status(
            job_id,
            status="processing",
            step="analyzing",
            percent=15,
            message="Analyzing your request...",
        )

        analysis = await analyze_prompt(prompt)

        await update_job_status(
            job_id,
            status="processing",
            step="analyzing",
            percent=25,
            message=f"Building a {analysis.intent} using {analysis.tech_stack}",
        )

        # Step 3: Generate code
        supabase.table("apps").update({"status": "generating"}).eq("id", app_id).execute()

        await update_job_status(
            job_id,
            status="processing",
            step="generating",
            percent=30,
            message="Generating code...",
        )

        generated_app = await generate_code(prompt, analysis)

        await update_job_status(
            job_id,
            status="processing",
            step="generating",
            percent=60,
            message=f"Generated {len(generated_app.files)} files",
        )

        # Store generated code in database
        files_data = [{"name": f.name, "content": f.content} for f in generated_app.files]
        supabase.table("apps").update({"source_code": files_data}).eq("id", app_id).execute()

        # Step 4: Deploy
        supabase.table("apps").update({"status": "deploying"}).eq("id", app_id).execute()

        await update_job_status(
            job_id,
            status="processing",
            step="deploying",
            percent=70,
            message="Deploying to cloud...",
        )

        deployment = await deploy_to_daytona(generated_app, app_id)

        await update_job_status(
            job_id,
            status="processing",
            step="deploying",
            percent=85,
            message="Almost there...",
        )

        # Step 5: Finalize
        await update_job_status(
            job_id,
            status="processing",
            step="finalizing",
            percent=95,
            message="Going live!",
        )

        # Update app with deployment info
        supabase.table("apps").update(
            {
                "status": "live",
                "live_url": deployment.live_url,
                "daytona_workspace_id": deployment.workspace_id,
                "title": analysis.title_suggestion,
                "description": analysis.description,
            }
        ).eq("id", app_id).execute()

        # TODO: Capture screenshot for thumbnail

        # Mark as completed
        await mark_job_completed(
            job_id,
            app_id=app_id,
            live_url=deployment.live_url,
            thumbnail_url=None,  # Would be set after screenshot capture
        )

        print(f"Job {job_id} completed successfully")

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


async def run_worker() -> None:
    """Main worker loop - processes jobs from the queue."""
    print("Starting generation worker...")

    r = await get_redis()

    while True:
        try:
            # Block and wait for a job
            result = await r.brpop("generation_queue", timeout=30)

            if result:
                _, job_id = result
                job_id = job_id.decode()
                await process_job(job_id)

        except Exception as e:
            print(f"Worker error: {e}")
            traceback.print_exc()
            await asyncio.sleep(5)


if __name__ == "__main__":
    asyncio.run(run_worker())
