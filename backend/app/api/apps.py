import uuid
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from supabase import Client

from ..core.deps import get_supabase, get_current_user, get_optional_user
from ..models.schemas import (
    AppCreate,
    AppPublish,
    AppResponse,
    AppListResponse,
    AppCreateResponse,
)
from ..services.generation import queue_generation_job

router = APIRouter(prefix="/apps", tags=["apps"])


def format_app_response(app: dict, user: Optional[dict] = None, is_liked: bool = False) -> dict:
    """Format app data for response."""
    return {
        **app,
        "user": {
            "username": app.get("users", {}).get("username") if app.get("users") else None,
            "avatar_url": app.get("users", {}).get("avatar_url") if app.get("users") else None,
        } if app.get("users") else None,
        "is_liked": is_liked,
    }


@router.get("", response_model=AppListResponse)
async def list_apps(
    supabase: Annotated[Client, Depends(get_supabase)],
    current_user: Annotated[Optional[dict], Depends(get_optional_user)],
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
):
    """List published apps for the feed."""
    offset = (page - 1) * limit

    # Get apps with user info (explicitly use the apps_user_id_fkey relationship)
    result = (
        supabase.table("apps")
        .select("*, users!apps_user_id_fkey(username, avatar_url)")
        .eq("is_published", True)
        .order("created_at", desc=True)
        .range(offset, offset + limit)
        .execute()
    )

    apps = result.data or []

    # Check if user has liked each app
    liked_app_ids = set()
    if current_user and apps:
        app_ids = [app["id"] for app in apps]
        likes_result = (
            supabase.table("likes")
            .select("app_id")
            .eq("user_id", current_user["id"])
            .in_("app_id", app_ids)
            .execute()
        )
        liked_app_ids = {like["app_id"] for like in (likes_result.data or [])}

    formatted_apps = [
        format_app_response(app, current_user, app["id"] in liked_app_ids)
        for app in apps
    ]

    # Check if there are more apps
    has_more = len(apps) == limit + 1
    if has_more:
        formatted_apps = formatted_apps[:-1]

    return {"apps": formatted_apps, "has_more": has_more}


@router.get("/{app_id}", response_model=AppResponse)
async def get_app(
    app_id: str,
    supabase: Annotated[Client, Depends(get_supabase)],
    current_user: Annotated[Optional[dict], Depends(get_optional_user)],
):
    """Get a single app by ID."""
    result = (
        supabase.table("apps")
        .select("*, users!apps_user_id_fkey(username, avatar_url)")
        .eq("id", app_id)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="App not found")

    app = result.data

    # Check if current user has liked this app
    is_liked = False
    if current_user:
        like_result = (
            supabase.table("likes")
            .select("*")
            .eq("user_id", current_user["id"])
            .eq("app_id", app_id)
            .execute()
        )
        is_liked = bool(like_result.data)

    # Increment view count
    supabase.table("apps").update({"views_count": app["views_count"] + 1}).eq(
        "id", app_id
    ).execute()

    return format_app_response(app, current_user, is_liked)


@router.post("", response_model=AppCreateResponse)
async def create_app(
    data: AppCreate,
    supabase: Annotated[Client, Depends(get_supabase)],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Create a new app from a prompt."""
    # Create app record
    app_id = str(uuid.uuid4())
    job_id = str(uuid.uuid4())

    result = (
        supabase.table("apps")
        .insert(
            {
                "id": app_id,
                "user_id": current_user["id"],
                "prompt": data.prompt,
                "status": "pending",
            }
        )
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create app",
        )

    # Queue the generation job
    await queue_generation_job(job_id, app_id, data.prompt, current_user["id"])

    return {"app_id": app_id, "job_id": job_id}


@router.post("/{app_id}/publish", response_model=AppResponse)
async def publish_app(
    app_id: str,
    data: AppPublish,
    supabase: Annotated[Client, Depends(get_supabase)],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Publish an app to the public feed."""
    # Get the app
    result = supabase.table("apps").select("*").eq("id", app_id).single().execute()

    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="App not found")

    app = result.data

    # Check ownership
    if app["user_id"] != current_user["id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your app")

    # Check status
    if app["status"] != "live":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="App must be live to publish",
        )

    # Update app
    update_result = (
        supabase.table("apps")
        .update(
            {
                "title": data.title,
                "description": data.description,
                "is_published": True,
            }
        )
        .eq("id", app_id)
        .select("*, users!apps_user_id_fkey(username, avatar_url)")
        .single()
        .execute()
    )

    return format_app_response(update_result.data)


@router.delete("/{app_id}")
async def delete_app(
    app_id: str,
    supabase: Annotated[Client, Depends(get_supabase)],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Delete an app."""
    # Get the app
    result = supabase.table("apps").select("*").eq("id", app_id).single().execute()

    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="App not found")

    app = result.data

    # Check ownership
    if app["user_id"] != current_user["id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your app")

    # TODO: Delete Daytona workspace

    # Delete app (cascades to likes and comments)
    supabase.table("apps").delete().eq("id", app_id).execute()

    return {"status": "deleted"}


@router.post("/{app_id}/like")
async def like_app(
    app_id: str,
    supabase: Annotated[Client, Depends(get_supabase)],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Like an app."""
    # Check if app exists
    app_result = supabase.table("apps").select("id, user_id").eq("id", app_id).single().execute()

    if not app_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="App not found")

    # Can't like own app
    if app_result.data["user_id"] == current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot like your own app",
        )

    # Check if already liked
    existing = (
        supabase.table("likes")
        .select("*")
        .eq("user_id", current_user["id"])
        .eq("app_id", app_id)
        .execute()
    )

    if existing.data:
        return {"status": "already_liked"}

    # Add like
    supabase.table("likes").insert(
        {"user_id": current_user["id"], "app_id": app_id}
    ).execute()

    # Increment likes count
    supabase.rpc("increment_likes", {"app_id": app_id}).execute()

    return {"status": "liked"}


@router.delete("/{app_id}/like")
async def unlike_app(
    app_id: str,
    supabase: Annotated[Client, Depends(get_supabase)],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Unlike an app."""
    # Delete like
    result = (
        supabase.table("likes")
        .delete()
        .eq("user_id", current_user["id"])
        .eq("app_id", app_id)
        .execute()
    )

    if result.data:
        # Decrement likes count
        supabase.rpc("decrement_likes", {"app_id": app_id}).execute()

    return {"status": "unliked"}
