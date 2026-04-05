"""File serving endpoint for agent-referenced local files."""

from pathlib import Path

import httpx
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse, Response

router = APIRouter(prefix="/api/files", tags=["files"])

ALLOWED_DIRS = ["/tmp", str(Path.home() / ".hermes")]


@router.get("/")
async def serve_file(path: str = Query(...)):
    file_path = Path(path).resolve()
    # Security: only serve from allowed directories
    if not any(str(file_path).startswith(d) for d in ALLOWED_DIRS):
        raise HTTPException(status_code=403, detail="Access denied")
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(str(file_path))


@router.get("/proxy/")
async def proxy_file(url: str = Query(...)):
    """Proxy a file from an agent URI so the browser doesn't need direct access."""
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            resp = await client.get(url)
            resp.raise_for_status()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"Failed to fetch from agent: {e}")
    content_type = resp.headers.get("content-type", "application/octet-stream")
    return Response(content=resp.content, media_type=content_type)
