import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import init_db
from routes.agents import router as agents_router
from routes.chat import router as chat_router
from routes.conversations import router as conversations_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="Hermes A2A Chat", lifespan=lifespan)

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


@app.get("/api/health")
async def health():
    return {"status": "ok"}


# Serve frontend static files in production
# Check both Docker path (ui-dist alongside backend) and dev build path (../ui/dist)
_here = Path(__file__).resolve().parent
for _candidate in [_here / "ui-dist", _here.parent / "ui" / "dist"]:
    if _candidate.is_dir():
        app.mount("/", StaticFiles(directory=str(_candidate), html=True), name="static")
        break
