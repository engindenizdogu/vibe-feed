"""Deploy Manager Agent - Deploys generated code to Daytona containers."""

import httpx
from pydantic import BaseModel

from ..core.config import get_settings
from .code_generator import GeneratedApp


class DeploymentResult(BaseModel):
    """Result of deployment."""

    workspace_id: str
    live_url: str


async def deploy_to_daytona(app: GeneratedApp, app_id: str) -> DeploymentResult:
    """Deploy generated app to Daytona container.

    Note: This is a placeholder implementation. The actual Daytona API
    integration will depend on the specific Daytona API endpoints and
    authentication method.
    """
    settings = get_settings()

    # For now, we'll create a simple static file server deployment
    # In production, this would:
    # 1. Create a Daytona workspace
    # 2. Push the generated files
    # 3. Start a simple HTTP server
    # 4. Return the public URL

    if not settings.daytona_api_url:
        # Development mode: return a mock URL
        # In production, you would integrate with actual Daytona API
        return DeploymentResult(
            workspace_id=f"mock-{app_id}",
            live_url=f"https://{app_id[:8]}.daytona.example.com",
        )

    async with httpx.AsyncClient() as client:
        # Create workspace
        create_response = await client.post(
            f"{settings.daytona_api_url}/workspaces",
            headers={"Authorization": f"Bearer {settings.daytona_api_key}"},
            json={
                "name": f"slop-{app_id[:8]}",
                "template": "static-site",
            },
        )
        create_response.raise_for_status()
        workspace_data = create_response.json()
        workspace_id = workspace_data["id"]

        # Upload files
        for file in app.files:
            await client.put(
                f"{settings.daytona_api_url}/workspaces/{workspace_id}/files/{file.name}",
                headers={"Authorization": f"Bearer {settings.daytona_api_key}"},
                content=file.content,
            )

        # Start the workspace
        start_response = await client.post(
            f"{settings.daytona_api_url}/workspaces/{workspace_id}/start",
            headers={"Authorization": f"Bearer {settings.daytona_api_key}"},
        )
        start_response.raise_for_status()

        # Get the public URL
        status_response = await client.get(
            f"{settings.daytona_api_url}/workspaces/{workspace_id}",
            headers={"Authorization": f"Bearer {settings.daytona_api_key}"},
        )
        status_response.raise_for_status()
        status_data = status_response.json()

        return DeploymentResult(
            workspace_id=workspace_id,
            live_url=status_data["public_url"],
        )


async def destroy_workspace(workspace_id: str) -> None:
    """Destroy a Daytona workspace."""
    settings = get_settings()

    if not settings.daytona_api_url or workspace_id.startswith("mock-"):
        return

    async with httpx.AsyncClient() as client:
        await client.delete(
            f"{settings.daytona_api_url}/workspaces/{workspace_id}",
            headers={"Authorization": f"Bearer {settings.daytona_api_key}"},
        )
