# Slop Feed

AI-generated app platform. Describe an app → Claude builds it → Deploy instantly.

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
- Redis
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
REDIS_URL=redis://localhost:6379
```

### 3. Start Redis

```bash
# macOS
brew services start redis

# Docker
docker run -d -p 6379:6379 redis
```

### 4. Run

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

**Redis connection**: Make sure Redis is running on port 6379

**Sandbox timeout**: Generation can take 1-3 minutes for complex apps
