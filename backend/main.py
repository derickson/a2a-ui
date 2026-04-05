import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.routing import APIRouter

from elasticapm.contrib.starlette import ElasticAPM, make_apm_client

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
base = settings.base_path.rstrip("/")  # e.g. "/a2a-ui" or ""

app = FastAPI(title="A2A UI", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if settings.elastic_apm_server_url:
    apm_config = {
        "SERVICE_NAME": "a2a-ui",
        "SERVER_URL": settings.elastic_apm_server_url,
        "ENVIRONMENT": settings.elastic_apm_environment,
    }
    if settings.elastic_apm_api_key:
        apm_config["API_KEY"] = settings.elastic_apm_api_key
    elif settings.elastic_apm_secret_token:
        apm_config["SECRET_TOKEN"] = settings.elastic_apm_secret_token
    apm_client = make_apm_client(apm_config)
    app.add_middleware(ElasticAPM, client=apm_client)

# Wrap all existing routers (which already have /api/* prefixes)
# under the base path prefix
base_router = APIRouter(prefix=base)
base_router.include_router(agents_router)
base_router.include_router(conversations_router)
base_router.include_router(chat_router)
base_router.include_router(elastic_router)
base_router.include_router(config_router)
base_router.include_router(files_router)


@base_router.get("/api/health/")
async def health():
    return {"status": "ok"}


app.include_router(base_router)

# Serve frontend static files in production
if os.environ.get("SERVE_STATIC", "").lower() in ("1", "true", "yes"):
    _here = Path(__file__).resolve().parent
    for _candidate in [_here / "ui-dist", _here.parent / "ui" / "dist"]:
        if _candidate.is_dir():
            mount_path = f"{base}/" if base else "/"
            app.mount(mount_path, StaticFiles(directory=str(_candidate), html=True), name="static")
            break
