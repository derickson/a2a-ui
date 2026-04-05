"""Agent CRUD routes."""

import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from a2a_client import fetch_agent_card
from database import get_db
from models import Agent

router = APIRouter(prefix="/api/agents", tags=["agents"])


class AgentCreate(BaseModel):
    url: str
    headers: dict[str, str] | None = None


class AgentUpdate(BaseModel):
    headers: dict[str, str] | None = None


class DiscoverRequest(BaseModel):
    url: str


@router.get("/")
async def list_agents(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Agent).order_by(Agent.created_at.desc()))
    agents = result.scalars().all()
    return [
        {
            "id": a.id,
            "name": a.name,
            "url": a.url,
            "description": a.description,
            "card_json": json.loads(a.card_json) if a.card_json else {},
            "headers_json": json.loads(a.headers_json) if a.headers_json else {},
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in agents
    ]


@router.post("/")
async def create_agent(body: AgentCreate, db: AsyncSession = Depends(get_db)):
    try:
        card = await fetch_agent_card(body.url, headers=body.headers)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch agent card: {e}")

    agent = Agent(
        name=card.get("name", "Unknown Agent"),
        url=body.url.rstrip("/"),
        description=card.get("description", ""),
        card_json=json.dumps(card),
        headers_json=json.dumps(body.headers or {}),
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


@router.delete("/{agent_id}/")
async def delete_agent(agent_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    await db.delete(agent)
    await db.commit()
    return {"ok": True}


@router.put("/{agent_id}/")
async def update_agent(agent_id: str, body: AgentUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    agent.headers_json = json.dumps(body.headers or {})
    await db.commit()
    await db.refresh(agent)
    return {
        "id": agent.id,
        "name": agent.name,
        "url": agent.url,
        "description": agent.description,
        "card_json": json.loads(agent.card_json) if agent.card_json else {},
        "headers_json": json.loads(agent.headers_json) if agent.headers_json else {},
        "created_at": agent.created_at.isoformat() if agent.created_at else None,
    }


@router.post("/discover/")
async def discover_agent(body: DiscoverRequest):
    try:
        card = await fetch_agent_card(body.url)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch agent card: {e}")
    return card
