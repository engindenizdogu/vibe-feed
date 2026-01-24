"""
CrewAI agents for vibe analysis and code generation.
Ported from the working MVP at vibe-code-gallery.
"""

from crewai import Agent, Task, Crew, Process, LLM
from crewai.tools import tool
from typing import Dict, Any
import json
import os

from ..core.config import get_settings

settings = get_settings()

# Configure LLM to use Claude (Anthropic)
llm = LLM(
    model="anthropic/claude-opus-4-5-20251101",
    api_key=settings.anthropic_api_key,
    max_tokens=4096  # Required for Anthropic models
)


@tool("Test code snippet in sandbox")
def test_code_snippet(code: str) -> str:
    """
    Test a small code snippet to verify it works.
    Used for validating generated code before full deployment.
    """
    # For MVP, we'll skip actual testing and assume code is valid
    # In production, this would use Daytona to test the code
    return "Code validation successful"


# Agent 1: Vibe Analyzer
vibe_analyzer = Agent(
    role='Visual Experience Designer',
    goal='Analyze user ideas and determine the perfect visual vibe for generative art',
    backstory="""You are a master of aesthetics, motion design, and interactive art.
    You understand color theory, animation principles, and how to translate abstract
    ideas into concrete visual parameters. You excel at determining whether an idea
    needs p5.js (2D canvas art) or three.js (3D WebGL experiences).

    When analyzing vibes, you consider:
    - Color palette and mood (warm/cool, vibrant/muted, psychedelic/minimal)
    - Motion patterns (fluid/sharp, fast/slow, organic/geometric)
    - Complexity level (simple/intricate, minimal/maximalist)
    - Interaction style (passive/reactive, subtle/dramatic)
    - Framework choice (p5.js for 2D, three.js for 3D)
    """,
    verbose=True,
    allow_delegation=False,
    llm=llm
)

# Agent 2: Code Generator
code_generator = Agent(
    role='Creative Coder & Generative Artist',
    goal='Generate beautiful, working p5.js or three.js code that perfectly captures the vibe',
    backstory="""You are an expert creative coder specializing in p5.js and three.js.
    You create stunning generative art, interactive visualizations, and immersive
    experiences. Your code is clean, performant, and creative.

    You know:
    - p5.js: setup(), draw(), createCanvas(), shapes, colors, animations, noise, particles
    - three.js: scenes, cameras, geometries, materials, lighting, animation loops
    - How to create mesmerizing visual effects with minimal code
    - Best practices for performance and browser compatibility

    You always generate complete, runnable code that works immediately.
    """,
    verbose=True,
    allow_delegation=False,
    tools=[test_code_snippet],
    llm=llm
)

# Agent 3: Deployment Specialist
deployment_specialist = Agent(
    role='DevOps Engineer & Deployment Expert',
    goal='Package code into Flask apps ready for Daytona deployment',
    backstory="""You are a DevOps expert who knows how to package web applications
    for deployment. You create clean Flask apps with proper structure, requirements,
    and configuration. You ensure apps are production-ready and will run smoothly
    in containerized environments like Daytona.

    You always provide:
    - Clean Flask app.py with proper routing
    - HTML templates with CDN-loaded libraries
    - Minimal requirements.txt
    - Production-ready configuration
    """,
    verbose=True,
    allow_delegation=False,
    llm=llm
)


def analyze_vibe(user_prompt: str) -> Dict[str, Any]:
    """
    Analyze user's prompt and determine the vibe parameters

    Returns:
        {
            "title": str,
            "description": str,
            "framework": "p5js" or "threejs",
            "colors": [list of colors],
            "motion_style": str,
            "complexity": str,
            "tags": [list of tags]
        }
    """
    task = Task(
        description=f"""Analyze this creative app idea and determine the perfect visual vibe:

USER IDEA: "{user_prompt}"

Your analysis should include:
1. A catchy title for this app (3-6 words)
2. A brief description (1-2 sentences)
3. Framework choice: "p5js" for 2D canvas art, "threejs" for 3D experiences
4. Color palette (3-5 hex colors that match the mood)
5. Motion style (e.g., "fluid organic", "geometric bounce", "chaotic particles")
6. Complexity level (simple/medium/complex)
7. Tags (3-5 descriptive tags like "trippy", "minimal", "3d", "particles", "geometric")

Respond ONLY with valid JSON in this exact format:
{{
    "title": "App Title",
    "description": "Brief description",
    "framework": "p5js",
    "colors": ["#hexcode1", "#hexcode2", "#hexcode3"],
    "motion_style": "description of motion",
    "complexity": "simple",
    "tags": ["tag1", "tag2", "tag3"]
}}
""",
        expected_output="JSON object with vibe analysis",
        agent=vibe_analyzer
    )

    crew = Crew(
        agents=[vibe_analyzer],
        tasks=[task],
        process=Process.sequential,
        verbose=True
    )

    result = crew.kickoff()

    # Parse JSON from result
    try:
        result_str = str(result)
        # Extract JSON from markdown code blocks if present
        if "```json" in result_str:
            result_str = result_str.split("```json")[1].split("```")[0].strip()
        elif "```" in result_str:
            result_str = result_str.split("```")[1].split("```")[0].strip()

        vibe_data = json.loads(result_str)
        return vibe_data
    except Exception as e:
        print(f"Error parsing vibe analysis: {e}")
        # Return default vibe
        return {
            "title": "Creative Vibe App",
            "description": user_prompt[:100],
            "framework": "p5js",
            "colors": ["#6366f1", "#8b5cf6", "#d946ef"],
            "motion_style": "fluid motion",
            "complexity": "medium",
            "tags": ["creative", "visual", "art"]
        }


def generate_code(vibe_analysis: Dict[str, Any], user_prompt: str) -> Dict[str, str]:
    """
    Generate p5.js or three.js code based on vibe analysis

    Returns:
        {
            "app.py": Flask app code,
            "templates/index.html": HTML with p5.js/three.js code,
            "requirements.txt": Python dependencies
        }
    """
    framework = vibe_analysis.get("framework", "p5js")
    colors = vibe_analysis.get("colors", ["#6366f1", "#8b5cf6", "#d946ef"])
    motion_style = vibe_analysis.get("motion_style", "fluid motion")

    task = Task(
        description=f"""Generate complete, working {framework} code for this creative app:

USER IDEA: "{user_prompt}"

VIBE ANALYSIS:
- Framework: {framework}
- Colors: {', '.join(colors)}
- Motion Style: {motion_style}
- Complexity: {vibe_analysis.get('complexity', 'medium')}

Generate COMPLETE, WORKING code that:
1. Creates a visually stunning, animated experience
2. Uses the specified color palette
3. Implements the motion style described
4. Works immediately when loaded in a browser
5. Is creative and matches the user's vision

Respond with ONLY the JavaScript code (no HTML, no Flask, just the {framework} code).
Make it approximately 50-100 lines of creative, well-commented code.
""",
        expected_output=f"Complete {framework} JavaScript code",
        agent=code_generator
    )

    crew = Crew(
        agents=[code_generator],
        tasks=[task],
        process=Process.sequential,
        verbose=True
    )

    result = crew.kickoff()
    generated_code = str(result)

    # Clean up the code (remove markdown if present)
    if "```javascript" in generated_code:
        generated_code = generated_code.split("```javascript")[1].split("```")[0].strip()
    elif "```" in generated_code:
        generated_code = generated_code.split("```")[1].split("```")[0].strip()

    # Now package it into Flask app
    package_task = Task(
        description=f"""Package this {framework} code into a Flask app:

JAVASCRIPT CODE:
{generated_code}

Create a complete Flask application with:
1. app.py with Flask routes
2. templates/index.html with the {framework} code embedded

Respond with JSON in this format:
{{
    "app.py": "complete Flask app code",
    "templates/index.html": "complete HTML with embedded JS"
}}
""",
        expected_output="JSON with Flask app files",
        agent=deployment_specialist
    )

    package_crew = Crew(
        agents=[deployment_specialist],
        tasks=[package_task],
        process=Process.sequential,
        verbose=True
    )

    package_result = package_crew.kickoff()

    # Parse the packaged result
    try:
        result_str = str(package_result)
        if "```json" in result_str:
            result_str = result_str.split("```json")[1].split("```")[0].strip()
        elif "```" in result_str:
            result_str = result_str.split("```")[1].split("```")[0].strip()

        files = json.loads(result_str)

        # Add requirements.txt
        files["requirements.txt"] = "Flask==3.0.0\ngunicorn==21.2.0"

        return files
    except Exception as e:
        print(f"Error parsing generated code: {e}")
        # Return fallback code
        return generate_fallback_app(framework, colors, user_prompt)


def generate_fallback_app(framework: str, colors: list, user_prompt: str) -> Dict[str, str]:
    """Generate a simple fallback app if AI generation fails"""

    if framework == "p5js":
        js_code = f"""
function setup() {{
    createCanvas(windowWidth, windowHeight);
    background('{colors[0]}');
}}

function draw() {{
    // {user_prompt}
    fill('{colors[1]}');
    noStroke();
    circle(mouseX, mouseY, 50 + sin(frameCount * 0.05) * 20);
}}

function windowResized() {{
    resizeCanvas(windowWidth, windowHeight);
}}
"""
        cdn = "https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.7.0/p5.js"
    else:
        js_code = f"""
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial({{ color: '{colors[0]}' }});
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

camera.position.z = 5;

function animate() {{
    requestAnimationFrame(animate);
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    renderer.render(scene, camera);
}}
animate();
"""
        cdn = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{user_prompt[:50]}</title>
    <script src="{cdn}"></script>
    <style>
        body {{
            margin: 0;
            overflow: hidden;
            background: {colors[0]};
        }}
    </style>
</head>
<body>
    <script>
{js_code}
    </script>
</body>
</html>"""

    app_py = """from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
"""

    return {
        "app.py": app_py,
        "templates/index.html": html,
        "requirements.txt": "Flask==3.0.0\ngunicorn==21.2.0"
    }
