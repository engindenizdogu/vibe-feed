# Vibe Feed

AI-generated app platform. Describe an app → Claude builds it → Deploy instantly.

## 1. Problem

The problem we’re solving is that a lot of people are vibe-coding apps and games, but there’s no simple way to discover what your friends are making or to share it easily. You can post on Twitter, but finding those projects later is noisy and full of friction. This feed makes it effortless to discover fun games and apps your friends are building and to share your own work in one focused place.

## 2. Constraints & Assumptions

The main challenge is coordinating two AI agents: one for planning (what to build) and one for execution (actually writing code). We assume Claude is capable enough to write functional HTML/CSS/JS apps from prompts. We also assume Daytona sandboxes provide stable environments where agents can safely run code. The system needs real-time progress updates, which requires WebSocket coordination between agents, job queue, and frontend.

## 3. Proposed Solution

A two-agent architecture where a Project Manager (backend) orchestrates a Developer Agent (Daytona sandbox). The Project Manager analyzes user prompts, breaks them into tasks, and delegates to the Developer Agent running Claude Agent SDK. This separation lets us iterate on planning logic without redeploying sandboxes, and keeps dangerous code execution isolated. Trade-off: adds complexity and latency versus single-agent approaches, but gives better control and safety.

## 4. System Architecture

**Frontend**: React Native (Expo) mobile app with social feed UI, WebSocket for live generation updates, Supabase for auth and data.

**Backend**: FastAPI server with job queue. Project Manager Agent runs here using Anthropic's API directly. When a user submits a prompt, it's queued and picked up by a worker process.

**Sandbox**: Daytona container with Claude Agent SDK. Developer Agent has file operations (write, edit, read) and bash execution. Creates apps in `/home/daytona`, starts HTTP server on port 80, returns public preview URL.

**Flow**: User prompt → Job queue → Worker picks job → Project Manager analyzes → Delegates via `<developer_task>` tags → Developer Agent creates files → Starts server → Returns URL → Project Manager verifies → Job complete.

**Failure modes**: If Developer Agent crashes, Project Manager marks job failed. If sandbox times out (3min+), we return error. If preview URL is inaccessible, Project Manager requests fixes.

## 5. Ideal End State

Production needs rate limiting (per-user sandbox quotas), better content moderation (currently just keyword filtering), and sandbox pooling to reduce cold start times. Database would need indexes on `created_at` for feed queries. Preview URLs should persist indefinitely, which means tracking sandbox lifecycle and potentially archiving static assets to S3 if Daytona bills per running container. First bottleneck: concurrent Anthropic API requests (could hit rate limits).

## 6. Hackathon Scope & Execution

Built in 24h: full two-agent system, mobile app with feed/create/profile screens, WebSocket progress updates, basic content moderation, integration with Daytona and Anthropic APIs. What's stubbed: thumbnail generation (marked TODO), comprehensive moderation (only keyword-based), user-initiated sandbox cleanup. This slice demonstrates the core idea because you can actually type a prompt on mobile, watch the agents work in real-time, and get a live URL back.

## 7. How to Run / Demo

See Quick Start section below.

## 8. Notes on AI Usage

See [AI.md](AI.md) for full disclosure of AI-assisted files. This project uses Claude extensively for both runtime functionality (the agents themselves) and development assistance. The Project Manager and Developer Agent prompts were hand-written to encode our architectural decisions. Core logic like the two-agent orchestration, Daytona integration, and WebSocket progress tracking were designed and implemented by us with AI used as an implementation accelerator.


## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER                                     │
│                    "Make a todo app"                             │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PROJECT MANAGER AGENT                          │
│                   (Backend - Claude Sonnet)                      │
│  • Analyzes user request                                         │
│  • Breaks down into implementation tasks                         │
│  • Delegates to Developer Agent                                  │
│  • Reviews output and requests fixes                             │
└─────────────────────────┬───────────────────────────────────────┘
                          │ <developer_task>
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   DEVELOPER AGENT                                │
│                   (Daytona Sandbox - Claude Agent SDK)           │
│  • Creates files (HTML/CSS/JS)                                   │
│  • Runs shell commands                                           │
│  • Starts web server                                             │
│  • Returns preview URL                                           │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
                   🌐 Live App URL
          https://80-xxx.proxy.daytona.works
```

## Prerequisites

- Node.js 18+
- Python 3.11+
- Expo Go app (for mobile testing)
- Daytona API key (from https://app.daytona.io)
- Anthropic API key

## Quick Start

### 1. Clone & Install

```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -e .
```

### 2. Environment Variables

**Frontend** (`frontend/.env`):
```
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
EXPO_PUBLIC_API_URL=http://localhost:8000
```

**Backend** (`backend/.env`):
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
SUPABASE_SERVICE_KEY=<service role key>
ANTHROPIC_API_KEY=<your key>
DAYTONA_API_KEY=<your key>
```

### 3. Run

```bash
# Terminal 1: Backend API
cd backend && source .venv/bin/activate
uvicorn app.main:app --reload

# Terminal 2: Worker (Two-Agent System)
cd backend && source .venv/bin/activate
python -m app.agents.worker

# Terminal 3: Frontend
cd frontend
npx expo start
```

## How It Works

1. **User submits prompt** → "Make a calculator app"

2. **Project Manager Agent** (runs on backend):
   - Analyzes the request
   - Creates detailed implementation plan
   - Delegates via `<developer_task>` tags

3. **Developer Agent** (runs in Daytona sandbox):
   - Uses Claude Agent SDK
   - Creates files, runs commands
   - Starts server on port 80
   - Returns preview URL

4. **Review Loop**:
   - Project Manager reviews output
   - Requests fixes if needed
   - Marks complete when app is live

5. **Result**: Live app URL returned to user

## Project Structure

```
frontend/              React Native (Expo)
├── app/               Screens (Feed, Create, Profile)
├── components/        Reusable components
└── lib/               API client, stores

backend/               Python FastAPI
├── app/api/           REST endpoints
├── app/agents/
│   ├── project_manager.py   # Orchestrator agent
│   ├── daytona_sandbox.py   # Sandbox management
│   ├── sandbox_agent.py     # Code for Developer Agent
│   └── worker.py            # Job processor
└── app/services/      Business logic

supabase/              Database migrations
```

## Key Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/v1/apps` | Create app from prompt |
| `GET /api/v1/apps` | List published apps |
| `WS /ws/generation/{job_id}` | Real-time updates |

## Troubleshooting

**Daytona errors**: Ensure `DAYTONA_API_KEY` is set correctly

**Sandbox timeout**: Generation can take 1-3 minutes for complex apps
