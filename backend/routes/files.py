"""File serving endpoint for agent-referenced local files."""

from pathlib import Path

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse

router = APIRouter(prefix="/api/files", tags=["files"])

ALLOWED_DIRS = ["/tmp"]


@router.get("/")
async def serve_file(path: str = Query(...)):
    file_path = Path(path).resolve()
    # Security: only serve from allowed directories
    if not any(str(file_path).startswith(d) for d in ALLOWED_DIRS):
        raise HTTPException(status_code=403, detail="Access denied")
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(str(file_path))
