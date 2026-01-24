"""
Daytona Sandbox Manager - Creates and manages Developer Agent sandboxes.

This module handles:
1. Creating Daytona sandboxes for app generation
2. Installing Claude Agent SDK in the sandbox
3. Running the Developer Agent
4. Capturing the preview URL
5. Cleanup
"""

import os
from daytona import Daytona, DaytonaConfig, CreateSandboxFromSnapshotParams
from ..core.config import get_settings
from .sandbox_agent import get_sandbox_agent_code


class DaytonaSandboxManager:
    """Manages Daytona sandboxes for app generation."""

    def __init__(self):
        settings = get_settings()
        config = DaytonaConfig(
            api_key=settings.daytona_api_key,
            api_url=settings.daytona_api_url,
        )
        self.daytona = Daytona(config)
        self.sandbox = None
        self.context = None
        self.preview_url = None
        self.anthropic_api_key = settings.anthropic_api_key

    def create_sandbox(self) -> str:
        """
        Create a new Daytona sandbox and initialize the Developer Agent.

        Returns:
            The preview URL for port 80
        """
        # Create sandbox with Anthropic API key in environment
        params = CreateSandboxFromSnapshotParams(
            language="python",
            env_vars={
                "ANTHROPIC_API_KEY": self.anthropic_api_key,
            }
        )
        self.sandbox = self.daytona.create(params)

        # Get preview URL for port 80
        preview_info = self.sandbox.get_preview_link(80)
        self.preview_url = preview_info.url

        # Install Claude Agent SDK
        self.sandbox.process.exec("pip install claude-agent-sdk==0.1.16")

        # Create code interpreter context
        self.context = self.sandbox.code_interpreter.create_context()

        # Upload the sandbox agent code
        agent_code = get_sandbox_agent_code()
        self.sandbox.fs.upload_file(agent_code.encode('utf-8'), "/tmp/sandbox_agent.py")

        # Initialize the agent in the interpreter context
        self.sandbox.code_interpreter.run_code(
            "import sys; sys.path.insert(0, '/tmp')",
            context=self.context,
        )
        self.sandbox.code_interpreter.run_code(
            "import sandbox_agent",
            context=self.context,
            envs={"PREVIEW_URL": self.preview_url},
        )

        return self.preview_url

    def run_developer_task(self, task: str) -> str:
        """
        Run a task in the Developer Agent.

        Args:
            task: The task description for the developer

        Returns:
            The developer's output
        """
        if not self.sandbox or not self.context:
            raise RuntimeError("Sandbox not initialized. Call create_sandbox first.")

        output_parts = []

        def on_stdout(msg):
            output_parts.append(msg.output)

        def on_stderr(msg):
            output_parts.append(msg.output)

        result = self.sandbox.code_interpreter.run_code(
            "sandbox_agent.run_query_sync(os.environ.get('TASK', ''))",
            context=self.context,
            envs={"TASK": task},
            on_stdout=on_stdout,
            on_stderr=on_stderr,
        )

        if result.error:
            output_parts.append(f"\nError: {result.error.value}")

        return "".join(output_parts) or "Developer Agent completed with no output."

    def get_preview_url(self) -> str | None:
        """Get the preview URL for the sandbox."""
        return self.preview_url

    def cleanup(self):
        """Delete the sandbox and clean up resources."""
        if self.context and self.sandbox:
            try:
                self.sandbox.code_interpreter.delete_context(self.context)
            except Exception:
                pass

        if self.sandbox:
            try:
                self.sandbox.delete()
            except Exception:
                pass

        self.sandbox = None
        self.context = None
        self.preview_url = None


class AsyncDaytonaSandboxManager:
    """Async version of DaytonaSandboxManager."""

    def __init__(self):
        from daytona import AsyncDaytona, DaytonaConfig, CreateSandboxFromSnapshotParams
        settings = get_settings()
        config = DaytonaConfig(
            api_key=settings.daytona_api_key,
            api_url=settings.daytona_api_url,
        )
        self.daytona = AsyncDaytona(config)
        self.sandbox = None
        self.context = None
        self.preview_url = None
        self.anthropic_api_key = settings.anthropic_api_key

    async def create_sandbox(self) -> str:
        """Create a new Daytona sandbox and initialize the Developer Agent."""
        async with self.daytona as daytona:
            # Create sandbox with env vars
            params = CreateSandboxFromSnapshotParams(
                language="python",
                env_vars={
                    "ANTHROPIC_API_KEY": self.anthropic_api_key,
                }
            )
            self.sandbox = await daytona.create(params)

            # Get preview URL
            preview_info = await self.sandbox.get_preview_link(80)
            self.preview_url = preview_info.url

            # Install Claude Agent SDK
            await self.sandbox.process.exec("pip install claude-agent-sdk==0.1.16")

            # Create context and initialize agent
            self.context = await self.sandbox.code_interpreter.create_context()

            agent_code = get_sandbox_agent_code()
            await self.sandbox.fs.upload_file(agent_code.encode('utf-8'), "/tmp/sandbox_agent.py")

            await self.sandbox.code_interpreter.run_code(
                "import sys; sys.path.insert(0, '/tmp')",
                context=self.context,
            )
            await self.sandbox.code_interpreter.run_code(
                "import sandbox_agent",
                context=self.context,
                envs={"PREVIEW_URL": self.preview_url},
            )

            return self.preview_url

    async def run_developer_task(self, task: str) -> str:
        """Run a task in the Developer Agent."""
        if not self.sandbox or not self.context:
            raise RuntimeError("Sandbox not initialized")

        output_parts = []

        async def on_stdout(msg):
            output_parts.append(msg.output)

        async def on_stderr(msg):
            output_parts.append(msg.output)

        result = await self.sandbox.code_interpreter.run_code(
            "sandbox_agent.run_query_sync(os.environ.get('TASK', ''))",
            context=self.context,
            envs={"TASK": task},
            on_stdout=on_stdout,
            on_stderr=on_stderr,
        )

        if result.error:
            output_parts.append(f"\nError: {result.error.value}")

        return "".join(output_parts) or "Developer Agent completed with no output."

    async def cleanup(self):
        """Clean up sandbox resources."""
        if self.context and self.sandbox:
            try:
                await self.sandbox.code_interpreter.delete_context(self.context)
            except Exception:
                pass

        if self.sandbox:
            try:
                await self.sandbox.delete()
            except Exception:
                pass
