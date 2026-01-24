"""Code Generator Agent - Generates complete app code from requirements."""

import anthropic
from pydantic import BaseModel

from ..core.config import get_settings
from .prompt_analyzer import PromptAnalysis


class GeneratedFile(BaseModel):
    """A generated file."""

    name: str
    content: str


class GeneratedApp(BaseModel):
    """Result of code generation."""

    files: list[GeneratedFile]
    entry_point: str  # Main HTML file


SYSTEM_PROMPT = """You are an expert frontend developer. Your job is to generate complete, working web applications based on requirements.

IMPORTANT RULES:
1. Generate COMPLETE, WORKING code - no placeholders or TODOs
2. All code must be self-contained and work without external APIs or backend
3. Use modern, clean code with good UX
4. Include proper styling (inline CSS or <style> tags)
5. Make it visually appealing with a dark theme by default
6. The app must work immediately when opened in a browser

For the tech stack:
- "vanilla_js": Use plain HTML, CSS, and JavaScript. Single index.html file preferred.
- "react": Use React with a simple setup (can use CDN imports)
- "canvas": Use HTML5 Canvas for graphics/games

Respond with a JSON object:
{
  "files": [
    {"name": "index.html", "content": "...complete HTML..."},
    {"name": "style.css", "content": "...if separate..."},
    {"name": "app.js", "content": "...if separate..."}
  ],
  "entry_point": "index.html"
}

For simple apps, a single index.html with embedded CSS/JS is preferred.
Make the UI beautiful, modern, and polished. Use subtle animations where appropriate."""


async def generate_code(prompt: str, analysis: PromptAnalysis) -> GeneratedApp:
    """Generate complete app code based on prompt and analysis."""
    settings = get_settings()
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    user_message = f"""Generate a complete, working web application based on these requirements:

**Original Prompt:** {prompt}

**Analysis:**
- Intent: {analysis.intent}
- Tech Stack: {analysis.tech_stack}
- Complexity: {analysis.complexity}
- Features to implement: {', '.join(analysis.features)}
- Suggested title: {analysis.title_suggestion}
- Description: {analysis.description}

Generate the complete code now. Remember:
- Make it visually stunning with a dark theme
- Include all necessary CSS styling
- Make it fully functional
- No external API calls or backend required
- It should work immediately when opened in a browser"""

    message = client.messages.create(
        model="claude-opus-4-20250514",
        max_tokens=16000,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": user_message,
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
        # Find the JSON block
        parts = response_text.split("```")
        for part in parts:
            part = part.strip()
            if part.startswith("{"):
                response_text = part
                break

    data = json.loads(response_text.strip())

    return GeneratedApp(
        files=[GeneratedFile(**f) for f in data["files"]],
        entry_point=data["entry_point"],
    )
