from typing import Optional, Literal
from datetime import datetime
from pydantic import BaseModel, Field


# User schemas
class UserBase(BaseModel):
    username: str
    avatar_url: Optional[str] = None


class UserResponse(UserBase):
    id: str
    email: str
    created_at: datetime


class UserUpdate(BaseModel):
    username: Optional[str] = None
    avatar_url: Optional[str] = None


# App schemas
AppStatus = Literal["pending", "analyzing", "generating", "deploying", "live", "failed"]


class AppBase(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=1000)


class AppCreate(AppBase):
    pass


class AppPublish(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)


class AppResponse(BaseModel):
    id: str
    user_id: str
    prompt: str
    title: Optional[str]
    description: Optional[str]
    thumbnail_url: Optional[str]
    screenshot_url: Optional[str]
    live_url: Optional[str]
    status: AppStatus
    is_published: bool
    likes_count: int
    views_count: int
    created_at: datetime
    updated_at: datetime
    user: Optional[UserBase] = None
    is_liked: Optional[bool] = None


class AppListResponse(BaseModel):
    apps: list[AppResponse]
    has_more: bool


class AppCreateResponse(BaseModel):
    app_id: str
    job_id: str


# Comment schemas
class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=500)


class CommentResponse(BaseModel):
    id: str
    user_id: str
    app_id: str
    content: str
    created_at: datetime
    user: Optional[UserBase] = None


# WebSocket schemas
class GenerationUpdate(BaseModel):
    type: Literal["status_update", "completed", "failed"]
    step: Optional[str] = None
    percent: Optional[int] = None
    message: Optional[str] = None
    app_id: Optional[str] = None
    live_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None


# Error schemas
class ErrorResponse(BaseModel):
    detail: str
