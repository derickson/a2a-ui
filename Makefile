VENV_DIR := $(HOME)/dev/.venvs/a2a-ui
VENV_LINK := .venv
BACKEND_DIR := backend
UI_DIR := ui

# Read BASE_PATH from .env if it exists
-include .env
export BASE_PATH

.PHONY: init start stop status docker-build docker-start docker-stop docker-redeploy

init:
	# Python venv
	uv venv $(VENV_DIR) --python 3.11
	ln -sfn $(VENV_DIR) $(VENV_LINK)
	uv pip install fastapi "uvicorn[standard]" aiosqlite "sqlalchemy[asyncio]" httpx pydantic pydantic-settings python-dotenv
	# Node deps
	cd $(UI_DIR) && npm install
	# Init DB
	cd $(BACKEND_DIR) && uv run python -c "import asyncio; from database import init_db; asyncio.run(init_db())"

start:
	@echo "Starting backend on :8000 and frontend on :5173"
	@echo "BASE_PATH=$(BASE_PATH)"
	cd $(BACKEND_DIR) && uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
	cd $(UI_DIR) && VITE_BASE_PATH=$(BASE_PATH) npm run dev &
	@echo "Backend: http://localhost:8000  Frontend: http://localhost:5173$(BASE_PATH)/"

stop:
	@# Kill processes on backend and frontend ports
	-lsof -ti :8000 | xargs kill 2>/dev/null || true
	-lsof -ti :5173 | xargs kill 2>/dev/null || true
	@sleep 1
	-lsof -ti :8000 | xargs kill -9 2>/dev/null || true
	-lsof -ti :5173 | xargs kill -9 2>/dev/null || true

status:
	@echo "=== Backend (port 8000) ==="
	@if pgrep -f "uvicorn main:app" > /dev/null 2>&1; then \
		echo "  PID: $$(pgrep -f 'uvicorn main:app' | head -1)"; \
		curl -s --max-time 2 http://localhost:8000$(BASE_PATH)/api/health/ && echo "" || echo "  Not responding"; \
	else \
		echo "  Not running"; \
	fi
	@echo ""
	@echo "=== Frontend (port 5173) ==="
	@if pgrep -f "vite" > /dev/null 2>&1; then \
		echo "  PID: $$(pgrep -f 'vite' | head -1)"; \
		curl -s --max-time 2 -o /dev/null -w "  HTTP %{http_code} — http://localhost:5173\n" http://localhost:5173 || echo "  Not responding"; \
	else \
		echo "  Not running"; \
	fi

docker-build:
	docker compose build

docker-start:
	docker compose up -d

docker-stop:
	docker compose down

docker-redeploy: docker-build
	docker compose down
	docker compose up -d
