from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from ..core.deps import get_supabase, get_current_user, get_optional_user
from ..models.schemas import UserResponse, UserUpdate, AppResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Get current user's profile."""
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_current_user(
    data: UserUpdate,
    supabase: Annotated[Client, Depends(get_supabase)],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Update current user's profile."""
    update_data = data.model_dump(exclude_unset=True)

    if not update_data:
        return current_user

    # Check username uniqueness if updating
    if "username" in update_data:
        existing = (
            supabase.table("users")
            .select("id")
            .eq("username", update_data["username"])
            .neq("id", current_user["id"])
            .execute()
        )
        if existing.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken",
            )

    result = (
        supabase.table("users")
        .update(update_data)
        .eq("id", current_user["id"])
        .select()
        .single()
        .execute()
    )

    return result.data


@router.delete("/me")
async def delete_current_user(
    supabase: Annotated[Client, Depends(get_supabase)],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Delete current user's account and all associated data."""
    user_id = current_user["id"]

    # TODO: Delete all Daytona workspaces for user's apps

    # Delete user (cascades to apps, likes, comments)
    supabase.table("users").delete().eq("id", user_id).execute()

    # Delete from Supabase Auth
    supabase.auth.admin.delete_user(user_id)

    return {"status": "deleted"}


@router.get("/{user_id}", response_model=UserResponse)
async def get_user_profile(
    user_id: str,
    supabase: Annotated[Client, Depends(get_supabase)],
):
    """Get a user's public profile."""
    result = supabase.table("users").select("*").eq("id", user_id).single().execute()

    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return result.data


@router.get("/{user_id}/apps", response_model=list[AppResponse])
async def get_user_apps(
    user_id: str,
    supabase: Annotated[Client, Depends(get_supabase)],
    current_user: Annotated[Optional[dict], Depends(get_optional_user)],
):
    """Get a user's published apps."""
    # Check if user exists
    user_result = supabase.table("users").select("id").eq("id", user_id).single().execute()

    if not user_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Get apps
    result = (
        supabase.table("apps")
        .select("*, users(username, avatar_url)")
        .eq("user_id", user_id)
        .eq("is_published", True)
        .order("created_at", desc=True)
        .execute()
    )

    apps = result.data or []

    # Check if current user has liked each app
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

    formatted_apps = []
    for app in apps:
        formatted_apps.append(
            {
                **app,
                "user": {
                    "username": app.get("users", {}).get("username"),
                    "avatar_url": app.get("users", {}).get("avatar_url"),
                }
                if app.get("users")
                else None,
                "is_liked": app["id"] in liked_app_ids,
            }
        )

    return formatted_apps
