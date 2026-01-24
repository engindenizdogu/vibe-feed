# AI Usage Disclosure

## Core Logic (Human-Designed, AI-Assisted Implementation)

**`backend/app/agents/`** - Two-agent architecture, orchestration logic, sandbox management, task delegation. These were designed by us and represent the core innovation. AI helped write the code, but we debugged the multi-turn conversations, error recovery, and agent coordination through manual testing.

**`backend/app/services/generation.py`** - Job queue and WebSocket coordination. We designed the async flow and failure modes.

## Standard Patterns (AI-Accelerated)

**`backend/app/api/`** - REST endpoints following FastAPI patterns

**`backend/app/models/`** - Pydantic schemas

**`frontend/`** - React Native components, API client, TypeScript types. Standard mobile app patterns with AI speeding up boilerplate.

**Config files** - `pyproject.toml`, `package.json`, `tsconfig.json`, database migrations

## No AI Assistance

- `README.md` sections 1-8
- System architecture decisions

## Validation

We tested the two-agent system end-to-end by generating 5+ apps. Debugged sandbox isolation, WebSocket reconnection, and agent failure scenarios manually. The system prompts were iterated through real execution, not just written once.
