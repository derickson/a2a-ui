"""Application configuration endpoint."""

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from config import get_settings
from database import get_db
from models import KibanaServer

router = APIRouter(prefix="/api/config", tags=["config"])


@router.get("/")
async def get_config(db: AsyncSession = Depends(get_db)):
    settings = get_settings()
    result = await db.execute(select(func.count()).select_from(KibanaServer))
    kibana_count = result.scalar() or 0
    return {
        "elastic_enabled": kibana_count > 0,
        "base_path": settings.base_path,
    }
