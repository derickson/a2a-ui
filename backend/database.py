import os

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from config import get_settings

_settings = get_settings()
_db_path = os.path.join(os.path.dirname(__file__), _settings.database_url)
DATA_DIR = os.path.dirname(_db_path)
os.makedirs(DATA_DIR, exist_ok=True)

DATABASE_URL = f"sqlite+aiosqlite:///{_db_path}"

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db():
    async with async_session() as session:
        yield session


async def init_db():
    from models import Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Safe migration: add headers_json column if it doesn't exist
        for migration in [
            "ALTER TABLE agents ADD COLUMN headers_json TEXT DEFAULT '{}'",
            "ALTER TABLE messages ADD COLUMN parts_json TEXT",
        ]:
            try:
                await conn.execute(text(migration))
            except Exception:
                pass  # Column already exists
