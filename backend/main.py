import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import get_settings
from database import init_db
from routes.agents import router as agents_router
from routes.app_config import router as config_router
from routes.chat import router as chat_router
from routes.conversations import router as conversations_router
from routes.elastic import router as elastic_router
from routes.files import router as files_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


settings = get_settings()
app = FastAPI(
    title="A2A UI",
    lifespan=lifespan,
    **({"root_path": settings.base_path} if settings.base_path else {}),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(agents_router)
app.include_router(conversations_router)
app.include_router(chat_router)
app.include_router(elastic_router)
app.include_router(config_router)
app.include_router(files_router)


@app.get("/api/health/")
async def health():
    return {"status": "ok"}


# Serve frontend static files in production (only when not in dev mode)
# Check both Docker path (ui-dist alongside backend) and dev build path (../ui/dist)
# Only mount if SERVE_STATIC env is set, to avoid shadowing API routes during dev
import os as _os
if _os.environ.get("SERVE_STATIC", "").lower() in ("1", "true", "yes"):
    _here = Path(__file__).resolve().parent
    for _candidate in [_here / "ui-dist", _here.parent / "ui" / "dist"]:
        if _candidate.is_dir():
            app.mount("/", StaticFiles(directory=str(_candidate), html=True), name="static")
            break
