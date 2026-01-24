"""
Sandbox Agent Script - Uploaded to Daytona sandbox and executed there.

This script is NOT run directly on the backend. It gets uploaded to the
Daytona sandbox and imported via the code interpreter. The Developer Agent
runs inside the sandbox using the Claude Agent SDK.
"""

SANDBOX_AGENT_CODE = '''
# Copyright 2025 Slop Feed
# This code runs inside the Daytona sandbox

import os
import sys
import asyncio
import logging

# Suppress INFO level logging
logging.getLogger('claude_agent_sdk').setLevel(logging.WARNING)

# Import the Claude Agent SDK
from claude_agent_sdk import ClaudeSDKClient, ClaudeAgentOptions, AssistantMessage, TextBlock, ToolUseBlock

# Helper to run async functions synchronously
def run_sync(coro):
    loop = asyncio.get_event_loop()
    return loop.run_until_complete(coro)

# Set up a global event loop
loop = asyncio.new_event_loop()
asyncio.set_event_loop(loop)

# Generate system prompt for the developer agent
preview_url = os.environ.get('PREVIEW_URL', 'https://80-xxxxx.proxy.daytona.works')
system_prompt = f"""You are a Developer Agent running inside a Daytona sandbox.
Your job is to create web applications based on the task description provided.

IMPORTANT RULES:
1. Use /home/daytona as your working directory for all file operations
2. Create complete, working web applications (HTML/CSS/JS)
3. Make the UI beautiful with a dark theme
4. Start a web server on port 80 when done
5. The public preview URL for port 80 is: {preview_url}

When starting a server, use:
  cd /home/daytona && python3 -m http.server 80 --bind 0.0.0.0 &

After creating the app, always:
1. List the files you created
2. Start the server
3. Confirm the preview URL is accessible
"""

# Create the agent client
client = ClaudeSDKClient(
    options=ClaudeAgentOptions(
        allowed_tools=["Read", "Edit", "Write", "Glob", "Grep", "Bash"],
        permission_mode="acceptEdits",
        system_prompt=system_prompt
    )
)

# Initialize the client
async def init_client():
    await client.__aenter__()
    print("Developer Agent SDK initialized.")

run_sync(init_client())

# Run a query and stream the response
async def run_query(prompt):
    output = []
    await client.query(prompt)
    async for message in client.receive_response():
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    text = block.text
                    if not text.endswith("\\n"):
                        text = text + "\\n"
                    sys.stdout.write(text)
                    sys.stdout.flush()
                    output.append(text)
                elif isinstance(block, ToolUseBlock):
                    tool_msg = f"🔨 {block.name}\\n"
                    sys.stdout.write(tool_msg)
                    sys.stdout.flush()
                    output.append(tool_msg)
    return "".join(output)

# Synchronous wrapper for run_query
def run_query_sync(prompt):
    return run_sync(run_query(prompt))
'''


def get_sandbox_agent_code() -> str:
    """Returns the Python code to be uploaded to the Daytona sandbox."""
    return SANDBOX_AGENT_CODE
