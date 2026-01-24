# Slop Feed

AI-generated app platform. Describe an app → Claude builds it → Deploy instantly.

## Prerequisites

- Node.js 18+
- Python 3.11+
- Redis
- Expo Go app on your phone (for mobile testing)

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
EXPO_PUBLIC_SUPABASE_URL=https://gxgbkxheqoxaxmebujao.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_FzcyzO6bz-zOXHrm1RpiHg_Q3095C9E
EXPO_PUBLIC_API_URL=http://localhost:8000
```

**Backend** (`backend/.env`):
```
DEBUG=true
SUPABASE_URL=https://gxgbkxheqoxaxmebujao.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_FzcyzO6bz-zOXHrm1RpiHg_Q3095C9E
SUPABASE_SERVICE_KEY=<get from team lead>
ANTHROPIC_API_KEY=<get from team lead>
REDIS_URL=redis://localhost:6379
```

### 3. Start Redis

```bash
# macOS
brew services start redis

# Linux
sudo systemctl start redis

# Docker
docker run -d -p 6379:6379 redis
```

### 4. Run

```bash
# Terminal 1: Backend API
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload

# Terminal 2: Background Worker
cd backend
source .venv/bin/activate
python -m app.agents.worker

# Terminal 3: Frontend
cd frontend
npx expo start
```

Scan the QR code with Expo Go to run on your phone.

## Project Structure

```
frontend/          React Native (Expo)
├── app/           Screens (Feed, Create, Profile)
├── components/    Reusable components
└── lib/           API client, stores, types

backend/           Python FastAPI
├── app/api/       REST endpoints
├── app/agents/    Claude AI agents
└── app/services/  Business logic

supabase/          Database migrations
```

## Key Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/apps` | List published apps |
| `POST /api/v1/apps` | Create app from prompt |
| `WS /ws/generation/{job_id}` | Real-time generation updates |

## Troubleshooting

**Redis connection error**: Make sure Redis is running on port 6379

**JWT errors**: The backend auto-fetches public keys from Supabase JWKS endpoint

**Expo not connecting**: Use `npx expo start --tunnel` if on different network
