# A2A UI

A web UI for communicating with A2A (Agent-to-Agent) protocol servers. Built with a FastAPI backend and Vite + React + Elastic EUI frontend.

## Features

- Chat with A2A-compatible agents via streaming responses
- Conversation history with resume capability
- Configure multiple agent endpoints (auto-discovers agent cards)
- Import agents from Elastic Agent Builder via Kibana integration
- Light/dark theme (defaults to OS preference)
- Responsive layout for mobile and desktop
- Reverse proxy support via configurable base path

## Quick Start

### Prerequisites

- Python 3.11+ with [uv](https://docs.astral.sh/uv/)
- Node.js 20+
- An A2A-compatible agent server (e.g. `http://claw:9000`)
- A `.env` file in the project root (see Configuration below)

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

## Configuration

A2A UI is configured via environment variables. Create a `.env` file in the project root:

```bash
# Database
DATABASE_URL=sqlite+aiosqlite:///./data/a2a-ui.db   # SQLite database path (default)

# Server
HOST=0.0.0.0       # Server bind host (default: 0.0.0.0)
PORT=8000           # Server port (default: 8000)

# Reverse proxy
BASE_PATH=          # Path prefix when behind a reverse proxy (default: empty, example: /a2a-ui)

# Elastic Agent Builder integration (optional)
KIBANA_URL=         # Kibana URL for agent auto-discovery
ELASTICSEARCH_API_KEY=  # API key for Kibana authentication
```

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | SQLite database path | `sqlite+aiosqlite:///./data/a2a-ui.db` |
| `HOST` | Server bind host | `0.0.0.0` |
| `PORT` | Server port | `8000` |
| `BASE_PATH` | Reverse proxy path prefix | _(empty)_ |
| `KIBANA_URL` | Kibana URL for Elastic Agent Builder auto-discovery | _(optional)_ |
| `ELASTICSEARCH_API_KEY` | API key for Kibana authentication | _(optional)_ |

## Reverse Proxy

To serve A2A UI under a sub-path (e.g. `https://example.com/a2a-ui`), set `BASE_PATH=/a2a-ui`. The backend will prefix all routes and static file mounts with this path, so the app works correctly behind a reverse proxy without any additional URL rewriting.

Example nginx configuration:

```nginx
location /a2a-ui/ {
    proxy_pass http://localhost:8000/a2a-ui/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_buffering off;           # required for SSE streaming
}
```

## Architecture

```
backend/               FastAPI + SQLite (async)
├── main.py            App entry, CORS, static mount, BASE_PATH routing
├── config.py          App settings (pydantic-settings, .env loading)
├── a2a_client.py      JSON-RPC 2.0 client (send/stream)
├── models.py          Agent, Conversation, Message
├── database.py        SQLAlchemy async engine
└── routes/
    ├── agents.py      Agent CRUD + discovery
    ├── conversations.py  Conversation + chat streaming
    ├── elastic.py     Elastic Agent Builder integration
    └── app_config.py  App configuration endpoint

ui/                    Vite + React + TypeScript + Elastic EUI
├── src/
│   ├── App.tsx           Layout, theme, state
│   ├── api/client.ts     Backend API wrappers
│   ├── hooks/useChat.ts  Streaming chat hook
│   └── components/       UI components
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents/` | List agents |
| POST | `/api/agents/` | Add agent by URL |
| PUT | `/api/agents/:id/` | Update agent headers |
| DELETE | `/api/agents/:id/` | Remove agent |
| POST | `/api/agents/discover/` | Preview agent card |
| GET | `/api/conversations/` | List conversations |
| GET | `/api/conversations/:id/` | Get conversation + messages |
| POST | `/api/conversations/` | Create conversation |
| DELETE | `/api/conversations/:id/` | Delete conversation |
| POST | `/api/chat/:id/` | Send message (SSE stream) |
| GET | `/api/config/` | Get app configuration |
| GET | `/api/elastic/agents/` | List Elastic Agent Builder agents |
| POST | `/api/elastic/agents/:id/import/` | Import Elastic agent |
