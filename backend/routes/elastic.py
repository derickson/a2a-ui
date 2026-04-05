"""Elastic Agent Builder integration routes with DB-persisted Kibana servers."""

import json

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Agent, KibanaServer

router = APIRouter(prefix="/api/elastic", tags=["elastic"])


# --- Kibana Server CRUD ---

class KibanaServerCreate(BaseModel):
    name: str
    url: str
    api_key: str


@router.get("/kibana-servers/")
async def list_kibana_servers(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(KibanaServer).order_by(KibanaServer.created_at.desc()))
    servers = result.scalars().all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "url": s.url,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in servers
    ]


@router.post("/kibana-servers/")
async def add_kibana_server(body: KibanaServerCreate, db: AsyncSession = Depends(get_db)):
    server = KibanaServer(
        name=body.name,
        url=body.url.rstrip("/"),
        api_key=body.api_key,
    )
    db.add(server)
    await db.commit()
    await db.refresh(server)
    return {
        "id": server.id,
        "name": server.name,
        "url": server.url,
        "created_at": server.created_at.isoformat() if server.created_at else None,
    }


@router.delete("/kibana-servers/{server_id}/")
async def delete_kibana_server(server_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(KibanaServer).where(KibanaServer.id == server_id))
    server = result.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="Kibana server not found")
    await db.delete(server)
    await db.commit()
    return {"ok": True}


# --- Agent Discovery from a Kibana Server ---

def _kibana_headers(api_key: str) -> dict[str, str]:
    return {"Authorization": f"ApiKey {api_key}", "kbn-xsrf": "true"}


@router.get("/kibana-servers/{server_id}/agents/")
async def list_elastic_agents(server_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(KibanaServer).where(KibanaServer.id == server_id))
    server = result.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="Kibana server not found")

    headers = _kibana_headers(server.api_key)
    url = f"{server.url}/api/agent_builder/agents"

    try:
        async with httpx.AsyncClient(timeout=30.0, headers=headers) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            return resp.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"Kibana error: {e.response.text}")
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Failed to connect to Kibana: {e}")


@router.post("/kibana-servers/{server_id}/agents/{agent_id}/import/")
async def import_elastic_agent(server_id: str, agent_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(KibanaServer).where(KibanaServer.id == server_id))
    server = result.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="Kibana server not found")

    headers = _kibana_headers(server.api_key)
    card_url = f"{server.url}/api/agent_builder/a2a/{agent_id}.json"

    try:
        async with httpx.AsyncClient(timeout=30.0, headers=headers) as client:
            resp = await client.get(card_url)
            resp.raise_for_status()
            card = resp.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"Kibana error: {e.response.text}")
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Failed to connect to Kibana: {e}")

    agent = Agent(
        url=f"{server.url}/api/agent_builder/a2a/{agent_id}",
        name=card.get("name", "Unknown Agent"),
        description=card.get("description", ""),
        card_json=json.dumps(card),
        headers_json=json.dumps(headers),
    )
    db.add(agent)
    await db.commit()
    await db.refresh(agent)

    return {
        "id": agent.id,
        "name": agent.name,
        "url": agent.url,
        "description": agent.description,
        "card_json": card,
        "headers_json": json.loads(agent.headers_json) if agent.headers_json else {},
        "created_at": agent.created_at.isoformat() if agent.created_at else None,
    }
