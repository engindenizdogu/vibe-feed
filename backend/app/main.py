from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import apps, comments, users, websocket
from .core.config import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting Slop Feed API...")
    yield
    # Shutdown
    print("Shutting down Slop Feed API...")


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description="API for Slop Feed - AI-generated app platform",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(apps.router, prefix="/api/v1")
app.include_router(comments.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(websocket.router)


@app.get("/")
async def root():
    return {"message": "Slop Feed API", "version": "0.1.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
