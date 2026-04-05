FROM node:20-slim AS frontend
WORKDIR /build
COPY ui/package.json ui/package-lock.json ./
RUN npm ci
COPY ui/ ./
RUN npm run build

FROM python:3.11-slim
WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

COPY backend/pyproject.toml ./
RUN uv pip install --system --no-cache -e "." 2>/dev/null || uv pip install --system --no-cache fastapi "uvicorn[standard]" aiosqlite "sqlalchemy[asyncio]" httpx pydantic

COPY backend/ ./
COPY --from=frontend /build/dist /app/ui-dist

ENV PYTHONUNBUFFERED=1

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
