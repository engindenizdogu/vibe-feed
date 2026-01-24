"""Prompt Analyzer Agent - Analyzes user prompts to determine app requirements."""

import anthropic
from pydantic import BaseModel

from ..core.config import get_settings


class PromptAnalysis(BaseModel):
    """Result of prompt analysis."""

    intent: str  # e.g., "game", "tool", "landing_page", "dashboard"
    tech_stack: str  # e.g., "vanilla_js", "react", "canvas"
    complexity: str  # "simple", "medium", "complex"
    features: list[str]  # Key features to implement
    title_suggestion: str  # Suggested title for the app
    description: str  # Brief description of what will be built


SYSTEM_PROMPT = """You are an expert app requirements analyst. Your job is to analyze user prompts and determine the best approach to build their requested application.

Given a user's prompt describing an app they want to build, analyze it and provide:

1. **Intent**: What type of app is this? (game, tool, landing_page, dashboard, form, visualization, calculator, etc.)

2. **Tech Stack**: What technology should be used?
   - "vanilla_js" - For simple apps, games, or when no framework is needed
   - "react" - For more complex UIs with state management
   - "canvas" - For games or visualizations that need direct drawing

3. **Complexity**: How complex is this app?
   - "simple" - Can be built in under 100 lines
   - "medium" - Requires 100-300 lines
   - "complex" - Requires 300+ lines

4. **Features**: List the key features that need to be implemented (3-7 features)

5. **Title Suggestion**: A catchy, short title for the app (2-5 words)

6. **Description**: A brief description of what will be built (1-2 sentences)

Respond with a JSON object matching this exact structure:
{
  "intent": "string",
  "tech_stack": "string",
  "complexity": "string",
  "features": ["string"],
  "title_suggestion": "string",
  "description": "string"
}"""


async def analyze_prompt(prompt: str) -> PromptAnalysis:
    """Analyze a user prompt and return structured requirements."""
    settings = get_settings()
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"Analyze this app request:\n\n{prompt}",
            }
        ],
    )

    # Extract JSON from response
    response_text = message.content[0].text

    # Parse JSON (handle potential markdown code blocks)
    import json

    if "```json" in response_text:
        response_text = response_text.split("```json")[1].split("```")[0]
    elif "```" in response_text:
        response_text = response_text.split("```")[1].split("```")[0]

    data = json.loads(response_text.strip())

    return PromptAnalysis(**data)
