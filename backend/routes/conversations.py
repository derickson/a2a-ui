"""Conversation CRUD routes."""

import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from models import Agent, Conversation, Message

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


class ConversationCreate(BaseModel):
    agent_id: str
    title: str | None = None


@router.get("/")
async def list_conversations(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.agent))
        .order_by(Conversation.updated_at.desc())
    )
    conversations = result.scalars().all()
    return [
        {
            "id": c.id,
            "agent_id": c.agent_id,
            "title": c.title,
            "context_id": c.context_id,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
            "agent": {
                "id": c.agent.id,
                "name": c.agent.name,
                "url": c.agent.url,
                "description": c.agent.description,
            }
            if c.agent
            else None,
        }
        for c in conversations
    ]


@router.get("/{conversation_id}")
async def get_conversation(conversation_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages), selectinload(Conversation.agent))
        .where(Conversation.id == conversation_id)
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {
        "id": conv.id,
        "agent_id": conv.agent_id,
        "title": conv.title,
        "context_id": conv.context_id,
        "created_at": conv.created_at.isoformat() if conv.created_at else None,
        "updated_at": conv.updated_at.isoformat() if conv.updated_at else None,
        "agent": {
            "id": conv.agent.id,
            "name": conv.agent.name,
            "url": conv.agent.url,
            "description": conv.agent.description,
        }
        if conv.agent
        else None,
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "task_id": m.task_id,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in conv.messages
        ],
    }


@router.post("/")
async def create_conversation(
    body: ConversationCreate, db: AsyncSession = Depends(get_db)
):
    # Verify agent exists
    result = await db.execute(select(Agent).where(Agent.id == body.agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    conv = Conversation(
        agent_id=body.agent_id,
        title=body.title or "New Conversation",
        context_id=str(uuid.uuid4()),
    )
    db.add(conv)
    await db.commit()
    await db.refresh(conv)
    return {
        "id": conv.id,
        "agent_id": conv.agent_id,
        "title": conv.title,
        "context_id": conv.context_id,
        "created_at": conv.created_at.isoformat() if conv.created_at else None,
        "updated_at": conv.updated_at.isoformat() if conv.updated_at else None,
        "agent": {
            "id": agent.id,
            "name": agent.name,
            "url": agent.url,
            "description": agent.description,
        },
    }


@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: str, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    await db.delete(conv)
    await db.commit()
    return {"ok": True}
