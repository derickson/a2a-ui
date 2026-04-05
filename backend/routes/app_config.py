"""Application configuration endpoint."""

from fastapi import APIRouter

from config import get_settings

router = APIRouter(prefix="/api/config", tags=["config"])


@router.get("/")
async def get_config():
    settings = get_settings()
    return {"elastic_enabled": settings.elastic_enabled, "base_path": settings.base_path}
