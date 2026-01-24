"""
Project Manager Agent - Runs on the backend and orchestrates the Developer Agent.

This agent:
1. Receives user prompts
2. Analyzes requirements and breaks them into tasks
3. Delegates coding tasks to the Developer Agent in the Daytona sandbox
4. Reviews outputs and decides if more work is needed
5. Returns the final result (live URL, status, etc.)
"""

import re
from typing import Callable, Awaitable
import anthropic

from ..core.config import get_settings


PROJECT_MANAGER_SYSTEM_PROMPT = """You are a Project Manager Agent for Slop Feed, an AI app generation platform.

Your role is to:
1. Understand user's app request and break it down into clear implementation tasks
2. Delegate coding tasks to a Developer Agent that works in a Daytona sandbox
3. Review the Developer Agent's responses and outputs
4. Ensure the app is complete and working before marking done

The Developer Agent has access to:
- File operations (create, read, edit files)
- Code execution (run shell commands)
- A web server on port 80 with a public preview URL

When you need the Developer Agent to do something:
- Use the <developer_task> tag to specify what you want
- Be SPECIFIC about what to build (features, UI style, tech stack)
- Wait for the developer's response
- Analyze the results and decide if more work is needed

IMPORTANT GUIDELINES:
1. For the FIRST task, give comprehensive requirements including:
   - App type and purpose
   - Key features to implement
   - UI style (dark theme, modern, etc.)
   - Tech stack (HTML/CSS/JS, Canvas for games, etc.)
   - Instruction to start server on port 80 when done

2. Review the Developer's output carefully:
   - Check if all features were implemented
   - Check if the server was started
   - Check if a preview URL was provided

3. When the app is complete and the server is running:
   - Extract the preview URL from the Developer's output
   - Say "APP_COMPLETE" followed by the URL in format: APP_COMPLETE:https://...

4. If something is wrong or missing:
   - Delegate another task to fix it
   - Be specific about what needs to be fixed

Example output when done:
"The app is now live! APP_COMPLETE:https://80-abc123.proxy.daytona.works"
"""


class ProjectManagerAgent:
    """Project Manager Agent that orchestrates app generation."""

    def __init__(self, api_key: str):
        self.client = anthropic.Anthropic(api_key=api_key)
        self.conversation_history: list[dict] = []

    def reset(self):
        """Reset conversation history for a new generation."""
        self.conversation_history = []

    async def process_request(
        self,
        user_prompt: str,
        run_developer_task: Callable[[str], str],
        on_progress: Callable[[str, int, str], Awaitable[None]] | None = None,
    ) -> tuple[str | None, str]:
        """
        Process a user's app generation request.

        Args:
            user_prompt: The user's description of the app they want
            run_developer_task: Callback to run a task in the Developer Agent
            on_progress: Optional callback for progress updates (step, percent, message)

        Returns:
            Tuple of (live_url or None, full_output)
        """
        # Add user message to conversation
        self.conversation_history.append({
            "role": "user",
            "content": f"User wants to create this app:\n\n{user_prompt}\n\nAnalyze this request and delegate the implementation to the Developer Agent.",
        })

        if on_progress:
            await on_progress("analyzing", 15, "Project Manager analyzing request...")

        full_output = ""
        live_url = None
        max_iterations = 5  # Prevent infinite loops

        for iteration in range(max_iterations):
            # Get Project Manager's response
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4096,
                system=PROJECT_MANAGER_SYSTEM_PROMPT,
                messages=self.conversation_history,
            )

            # Extract text response
            assistant_message = ""
            for block in response.content:
                if block.type == "text":
                    assistant_message += block.text

            full_output += f"\n[Project Manager]: {assistant_message}\n"

            # Add to conversation history
            self.conversation_history.append({
                "role": "assistant",
                "content": response.content,
            })

            # Check if app is complete
            complete_match = re.search(r"APP_COMPLETE:(https?://[^\s]+)", assistant_message)
            if complete_match:
                live_url = complete_match.group(1)
                if on_progress:
                    await on_progress("finalizing", 95, "App generation complete!")
                break

            # Check for developer task delegation
            task_match = re.search(r"<developer_task>([\s\S]*?)</developer_task>", assistant_message)

            if task_match:
                developer_task = task_match.group(1).strip()

                if on_progress:
                    percent = 30 + (iteration * 15)
                    await on_progress("generating", min(percent, 80), "Developer Agent working...")

                full_output += f"\n[Delegating to Developer Agent]...\n"

                # Run the developer task in the sandbox
                developer_output = run_developer_task(developer_task)

                full_output += f"\n[Developer Agent Output]:\n{developer_output}\n"

                # Feed developer's response back to Project Manager
                self.conversation_history.append({
                    "role": "user",
                    "content": f"Developer Agent completed the task. Here's their output:\n\n{developer_output}\n\nReview this output. If the app is complete and the server is running with a preview URL, say APP_COMPLETE:URL. Otherwise, delegate another task to fix any issues.",
                })

                if on_progress:
                    await on_progress("deploying", 85, "Reviewing deployment...")
            else:
                # No more tasks to delegate, PM is done
                break

        return live_url, full_output
