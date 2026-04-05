VENV_DIR := $(HOME)/dev/.venvs/hermes-a2a-app
VENV_LINK := .venv
BACKEND_DIR := backend
UI_DIR := ui

.PHONY: init start stop docker-build docker-start docker-stop docker-redeploy

init:
	# Python venv
	uv venv $(VENV_DIR) --python 3.11
	ln -sfn $(VENV_DIR) $(VENV_LINK)
	uv pip install fastapi "uvicorn[standard]" aiosqlite "sqlalchemy[asyncio]" httpx pydantic
	# Node deps
	cd $(UI_DIR) && npm install
	# Init DB
	cd $(BACKEND_DIR) && uv run python -c "import asyncio; from database import init_db; asyncio.run(init_db())"

start:
	@echo "Starting backend on :8000 and frontend on :5173"
	cd $(BACKEND_DIR) && uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
	cd $(UI_DIR) && npm run dev &
	@echo "Backend: http://localhost:8000  Frontend: http://localhost:5173"

stop:
	-pkill -f "uvicorn main:app" 2>/dev/null || true
	-pkill -f "vite" 2>/dev/null || true

docker-build:
	docker compose build

docker-start:
	docker compose up -d

docker-stop:
	docker compose down

docker-redeploy: docker-build
	docker compose down
	docker compose up -d
