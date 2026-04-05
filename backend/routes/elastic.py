"""Elastic Agent Builder integration routes."""

import json

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from config import get_settings
from database import get_db
from models import Agent

router = APIRouter(prefix="/api/elastic", tags=["elastic"])


@router.get("/agents/")
async def list_elastic_agents():
    settings = get_settings()
    if not settings.elastic_enabled:
        raise HTTPException(status_code=404, detail="Elastic integration not configured")

    headers = {
        "Authorization": f"ApiKey {settings.elasticsearch_api_key}",
        "kbn-xsrf": "true",
    }
    url = f"{settings.kibana_url.rstrip('/')}/api/agent_builder/agents"

    async with httpx.AsyncClient(timeout=30.0, headers=headers) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.json()


@router.post("/agents/{agent_id}/import/")
async def import_elastic_agent(agent_id: str, db: AsyncSession = Depends(get_db)):
    settings = get_settings()
    if not settings.elastic_enabled:
        raise HTTPException(status_code=404, detail="Elastic integration not configured")

    headers = {
        "Authorization": f"ApiKey {settings.elasticsearch_api_key}",
        "kbn-xsrf": "true",
    }
    card_url = f"{settings.kibana_url.rstrip('/')}/api/agent_builder/a2a/{agent_id}.json"

    async with httpx.AsyncClient(timeout=30.0, headers=headers) as client:
        resp = await client.get(card_url)
        resp.raise_for_status()
        card = resp.json()

    agent = Agent(
        url=f"{settings.kibana_url.rstrip('/')}/api/agent_builder/a2a/{agent_id}",
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
