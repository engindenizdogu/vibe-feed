"""
Apps API endpoints.
Handles app creation, listing, publishing, and interactions.
"""

import uuid
from typing import Annotated, Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from supabase import Client

from ..core.deps import get_supabase, get_current_user, get_optional_user
from ..models.schemas import (
    AppCreate,
    AppPublish,
    AppResponse,
    AppListResponse,
)
from ..services.agents import analyze_vibe, generate_code
from ..services.daytona_manager import daytona_manager
from ..services.complexity_analyzer import analyze_complexity

router = APIRouter(prefix="/apps", tags=["apps"])


# Response model for create endpoint (like MVP)
class AppCreateResponse(BaseModel):
    app_id: str
    title: str
    description: str
    live_url: str
    vibe_analysis: dict
    tags: List[str]


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

    # Get apps with user info
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
    """
    Create a new vibe-coded app from user prompt.

    Flow (exactly like MVP):
    1. Analyze vibe with AI
    2. Generate code with AI
    3. Deploy to Daytona
    4. Save to database
    5. Return app details
    """
    try:
        user_prompt = data.prompt.strip()

        if not user_prompt:
            raise HTTPException(status_code=400, detail="Prompt cannot be empty")

        print(f"\n🎨 Creating vibe app: '{user_prompt[:50]}...'")

        # Step 1: Analyze vibe
        print("📊 Analyzing vibe...")
        vibe_analysis = analyze_vibe(user_prompt)
        print(f"✅ Vibe analyzed: {vibe_analysis.get('title')}")

        # Step 2: Generate code
        print("💻 Generating code...")
        code_files = generate_code(vibe_analysis, user_prompt)
        print(f"✅ Code generated ({len(code_files)} files)")

        # Step 3: Deploy to Daytona
        print("🚀 Deploying to Daytona...")
        deployment = daytona_manager.deploy_flask_app(
            app_name=vibe_analysis.get("title", "vibe-app"),
            code_files=code_files
        )
        print(f"✅ Deployed: {deployment['url']}")

        # Step 4: Save to database
        app_id = str(uuid.uuid4())

        result = (
            supabase.table("apps")
            .insert({
                "id": app_id,
                "user_id": current_user["id"],
                "prompt": user_prompt,
                "title": vibe_analysis.get("title", "Untitled Vibe App"),
                "description": vibe_analysis.get("description", user_prompt[:200]),
                "live_url": deployment["url"],
                "daytona_workspace_id": deployment["workspace_id"],
                "status": "live",
                "is_published": False,
                "likes_count": 0,
                "views_count": 0,
            })
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save app to database",
            )

        print(f"✅ App created successfully! ID: {app_id}")

        return AppCreateResponse(
            app_id=app_id,
            title=vibe_analysis.get("title", "Untitled Vibe App"),
            description=vibe_analysis.get("description", user_prompt[:200]),
            live_url=deployment["url"],
            vibe_analysis=vibe_analysis,
            tags=vibe_analysis.get("tags", [])
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error creating app: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create app: {str(e)}")


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

    # Delete Daytona workspace if exists
    if app.get("daytona_workspace_id"):
        daytona_manager.delete_workspace(app["daytona_workspace_id"])

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


@router.post("/analyze-complexity")
async def analyze_prompt_complexity(data: AppCreate):
    """
    Analyze the complexity of an app idea without creating it.

    Returns:
        - complexity_score: 0-100
        - complexity_label: Simple/Moderate/Complex/Very Complex
        - complexity_color: Hex color for UI
        - detected_features: List of detected features
        - feature_count: Number of features detected
    """
    result = analyze_complexity(data.prompt)
    return result
