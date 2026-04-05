# Hermes A2A Chat

A web UI for communicating with A2A (Agent-to-Agent) protocol servers. Built with a FastAPI backend and Vite + React + Elastic EUI frontend.

## Features

- Chat with A2A-compatible agents via streaming responses
- Conversation history with resume capability
- Configure multiple agent endpoints (auto-discovers agent cards)
- Light/dark theme (defaults to OS preference)
- Responsive layout for mobile and desktop

## Quick Start

### Prerequisites

- Python 3.11+ with [uv](https://docs.astral.sh/uv/)
- Node.js 20+
- An A2A-compatible agent server (e.g. `http://claw:9000`)

### Development

```bash
# Initialize project (venv, deps, database)
make init

# Start backend (:8000) and frontend dev server (:5173)
make start

# Stop all services
make stop
```

Open http://localhost:5173, add your agent URL, and start chatting.

### Docker

```bash
# Build and start
make docker-build
make docker-start

# Rebuild and redeploy
make docker-redeploy

# Stop
make docker-stop
```

Production runs at http://localhost:8000.

## Architecture

```
backend/          FastAPI + SQLite (async)
├── main.py       App entry, CORS, static mount
├── a2a_client.py JSON-RPC 2.0 client (send/stream)
├── models.py     Agent, Conversation, Message
├── database.py   SQLAlchemy async engine
└── routes/       API endpoints

ui/               Vite + React + TypeScript + Elastic EUI
├── src/
│   ├── App.tsx           Layout, theme, state
│   ├── api/client.ts     Backend API wrappers
│   ├── hooks/useChat.ts  Streaming chat hook
│   └── components/       UI components
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents` | List agents |
| POST | `/api/agents` | Add agent by URL |
| DELETE | `/api/agents/:id` | Remove agent |
| POST | `/api/agents/discover` | Preview agent card |
| GET | `/api/conversations` | List conversations |
| GET | `/api/conversations/:id` | Get conversation + messages |
| POST | `/api/conversations` | Create conversation |
| DELETE | `/api/conversations/:id` | Delete conversation |
| POST | `/api/chat/:id` | Send message (SSE stream) |
