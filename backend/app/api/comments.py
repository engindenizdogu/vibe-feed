from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client

from ..core.deps import get_supabase, get_current_user
from ..models.schemas import CommentCreate, CommentResponse

router = APIRouter(prefix="/apps/{app_id}/comments", tags=["comments"])


@router.get("", response_model=list[CommentResponse])
async def list_comments(
    app_id: str,
    supabase: Annotated[Client, Depends(get_supabase)],
):
    """List comments for an app."""
    # Check if app exists
    app_result = supabase.table("apps").select("id").eq("id", app_id).single().execute()

    if not app_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="App not found")

    # Get comments with user info
    result = (
        supabase.table("comments")
        .select("*, users!comments_user_id_fkey(username, avatar_url)")
        .eq("app_id", app_id)
        .order("created_at", desc=True)
        .execute()
    )

    comments = []
    for comment in result.data or []:
        comments.append(
            {
                **comment,
                "user": {
                    "username": comment.get("users", {}).get("username"),
                    "avatar_url": comment.get("users", {}).get("avatar_url"),
                }
                if comment.get("users")
                else None,
            }
        )

    return comments


@router.post("", response_model=CommentResponse)
async def create_comment(
    app_id: str,
    data: CommentCreate,
    supabase: Annotated[Client, Depends(get_supabase)],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Add a comment to an app."""
    # Check if app exists
    app_result = supabase.table("apps").select("id").eq("id", app_id).single().execute()

    if not app_result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="App not found")

    # Create comment
    result = (
        supabase.table("comments")
        .insert(
            {
                "user_id": current_user["id"],
                "app_id": app_id,
                "content": data.content,
            }
        )
        .select("*, users!comments_user_id_fkey(username, avatar_url)")
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create comment",
        )

    comment = result.data
    return {
        **comment,
        "user": {
            "username": comment.get("users", {}).get("username"),
            "avatar_url": comment.get("users", {}).get("avatar_url"),
        }
        if comment.get("users")
        else None,
    }


@router.delete("/{comment_id}")
async def delete_comment(
    app_id: str,
    comment_id: str,
    supabase: Annotated[Client, Depends(get_supabase)],
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Delete a comment."""
    # Get the comment
    result = (
        supabase.table("comments")
        .select("*")
        .eq("id", comment_id)
        .eq("app_id", app_id)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")

    comment = result.data

    # Check ownership
    if comment["user_id"] != current_user["id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your comment")

    # Delete comment
    supabase.table("comments").delete().eq("id", comment_id).execute()

    return {"status": "deleted"}
