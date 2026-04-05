"""Chat streaming endpoint."""

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from a2a_client import stream_message
from database import async_session, get_db
from models import Conversation, Message

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatMessage(BaseModel):
    message: str


def _extract_text_from_event(event: dict) -> tuple[str, str | None]:
    """Extract text content and task_id from an A2A SSE event.

    Returns (text, task_id) where text may be empty.
    """
    text = ""
    task_id = None

    result = event.get("result", {})
    if not result:
        return text, task_id

    # Extract task ID if present
    task_id = result.get("id") or result.get("taskId")

    # Check for artifacts containing text parts
    status = result.get("status", {})
    artifact = result.get("artifact")

    # Text from artifact parts
    if artifact:
        parts = artifact.get("parts", [])
        for part in parts:
            if "text" in part:
                text += part["text"]

    # Also check status message parts (some agents send text here)
    if status and isinstance(status, dict):
        message = status.get("message")
        if message and isinstance(message, dict):
            parts = message.get("parts", [])
            for part in parts:
                if "text" in part:
                    text += part["text"]

    return text, task_id


@router.post("/{conversation_id}")
async def chat_stream(
    conversation_id: str,
    body: ChatMessage,
    db: AsyncSession = Depends(get_db),
):
    # Load conversation with agent
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.agent))
        .where(Conversation.id == conversation_id)
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if not conv.agent:
        raise HTTPException(status_code=404, detail="Agent not found for conversation")

    agent_url = conv.agent.url
    context_id = conv.context_id

    # Save user message
    user_msg = Message(
        conversation_id=conversation_id,
        role="user",
        content=body.message,
    )
    db.add(user_msg)

    # Update title if still default
    if conv.title == "New Conversation":
        conv.title = body.message[:50].strip()

    conv.updated_at = datetime.now(timezone.utc)
    await db.commit()

    async def event_generator():
        collected_text = ""
        task_id = None

        try:
            async for event in stream_message(agent_url, body.message, context_id):
                # Forward the raw event to the client
                yield f"data: {json.dumps(event)}\n\n"

                # Collect text from the event for DB storage
                text, tid = _extract_text_from_event(event)
                if text:
                    collected_text += text
                if tid:
                    task_id = tid

        except Exception as e:
            error_event = {"error": str(e)}
            yield f"data: {json.dumps(error_event)}\n\n"
            collected_text = f"[Error communicating with agent: {e}]"

        # Save agent response to DB after stream completes
        if collected_text:
            async with async_session() as save_db:
                agent_msg = Message(
                    conversation_id=conversation_id,
                    role="agent",
                    content=collected_text,
                    task_id=task_id,
                )
                save_db.add(agent_msg)
                await save_db.commit()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
