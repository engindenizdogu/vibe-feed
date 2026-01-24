"""
Daytona workspace management for deploying Flask apps.
Ported from the working MVP at vibe-code-gallery.
"""

from daytona_sdk import Daytona, CreateSandboxFromSnapshotParams
import os
import time
from typing import Dict, Any, Optional
import tempfile

from ..core.config import get_settings


class DaytonaManager:
    """Manages Daytona workspace creation and deployment"""

    def __init__(self):
        self.daytona: Optional[Daytona] = None
        self._initialize()

    def _initialize(self):
        """Initialize Daytona SDK"""
        settings = get_settings()
        api_key = settings.daytona_api_key

        if not api_key:
            print("Warning: DAYTONA_API_KEY not set. Deployment will be disabled.")
            return

        try:
            self.daytona = Daytona()
            print("Daytona SDK initialized successfully")
        except Exception as e:
            print(f"Warning: Could not initialize Daytona: {e}")

    def deploy_flask_app(self, app_name: str, code_files: Dict[str, str]) -> Dict[str, Any]:
        """
        Deploy a Flask app to Daytona

        Args:
            app_name: Name of the app
            code_files: Dictionary of filename -> content
                Expected: {'app.py': '...', 'templates/index.html': '...', 'requirements.txt': '...'}

        Returns:
            Dictionary with workspace_id and url
        """
        if not self.daytona:
            raise Exception("Daytona SDK not initialized. Please set DAYTONA_API_KEY.")

        try:
            # Create workspace with public access
            print(f"Creating Daytona workspace for {app_name}...")
            params = CreateSandboxFromSnapshotParams(
                auto_stop_interval=0,  # Don't auto-stop
                public=True  # Make publicly accessible
            )
            workspace = self.daytona.create(params)
            workspace_id = workspace.id

            print(f"Workspace created: {workspace_id}")

            # Create directory structure and write files
            print("Writing application files...")

            # Create templates directory
            workspace.process.exec("mkdir -p templates")

            # Write each file using temporary files
            for filepath, content in code_files.items():
                # Create a temporary file with the content
                with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.tmp') as tmp:
                    tmp.write(content)
                    tmp_path = tmp.name

                # Upload the temporary file to the workspace
                workspace.fs.upload_file(tmp_path, filepath)

                # Clean up the temporary file
                os.unlink(tmp_path)
                print(f"  Written {filepath}")

            # Install dependencies
            print("Installing dependencies...")
            install_result = workspace.process.exec("pip install -r requirements.txt")
            if install_result.exit_code != 0:
                print(f"Warning: pip install had issues: {install_result.result}")

            # Start Flask app in background
            print("Starting Flask app...")
            workspace.process.exec("nohup python app.py > /dev/null 2>&1 &")

            # Give it a moment to start
            time.sleep(2)

            # Get the preview URL for port 5000 (Flask default)
            print("Getting preview URL...")
            preview_info = workspace.get_preview_link(5000)
            public_url = preview_info.url

            print(f"App deployed successfully!")
            print(f"URL: {public_url}")

            return {
                "workspace_id": workspace_id,
                "url": public_url,
                "status": "deployed"
            }

        except Exception as e:
            print(f"Deployment failed: {e}")
            raise Exception(f"Failed to deploy app: {str(e)}")

    def delete_workspace(self, workspace_id: str) -> bool:
        """Delete a Daytona workspace"""
        if not self.daytona:
            return False

        try:
            # Get workspace and delete
            workspace = self.daytona.get(workspace_id)
            workspace.delete()
            print(f"Deleted workspace: {workspace_id}")
            return True
        except Exception as e:
            print(f"Failed to delete workspace {workspace_id}: {e}")
            return False

    def check_workspace_status(self, workspace_id: str) -> bool:
        """Check if a workspace is still active"""
        if not self.daytona:
            return False

        try:
            workspace = self.daytona.get(workspace_id)
            return workspace is not None
        except:
            return False


# Singleton instance
daytona_manager = DaytonaManager()
