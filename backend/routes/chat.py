"""Chat streaming endpoint."""

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from a2a_client import send_message, stream_message
from database import async_session, get_db
from models import Conversation, Message

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatMessage(BaseModel):
    message: str


def _extract_parts_from_event(event: dict) -> tuple[list[dict], str | None, str | None]:
    """Extract ALL parts (text, file, data), task_id, and contextId from an A2A SSE event."""
    parts = []
    task_id = None
    result = event.get("result", {})
    if not result:
        return parts, task_id, None
    task_id = result.get("id") or result.get("taskId")
    context_id = result.get("contextId")

    # From artifact parts
    artifact = result.get("artifact")
    if artifact:
        parts.extend(artifact.get("parts", []))

    # From status message parts
    status = result.get("status", {})
    if status and isinstance(status, dict):
        message = status.get("message")
        if message and isinstance(message, dict):
            parts.extend(message.get("parts", []))

    return parts, task_id, context_id


@router.post("/{conversation_id}/")
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
    agent_headers = json.loads(conv.agent.headers_json) if conv.agent.headers_json else {}

    # Check if agent supports streaming
    card = json.loads(conv.agent.card_json) if conv.agent.card_json else {}
    supports_streaming = card.get("capabilities", {}).get("streaming", False)

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
        collected_parts: list[dict] = []
        task_id = None

        try:
            if supports_streaming:
                returned_context = None
                async for event in stream_message(agent_url, body.message, context_id, headers=agent_headers):
                    yield f"data: {json.dumps(event)}\n\n"
                    parts, tid, ctx = _extract_parts_from_event(event)
                    if parts:
                        collected_parts.extend(parts)
                    if tid:
                        task_id = tid
                    if ctx:
                        returned_context = ctx
                # Update contextId if agent returned a different one
                if returned_context and returned_context != context_id:
                    async with async_session() as ctx_db:
                        from sqlalchemy import update
                        await ctx_db.execute(
                            update(Conversation)
                            .where(Conversation.id == conversation_id)
                            .values(context_id=returned_context)
                        )
                        await ctx_db.commit()
            else:
                # Non-streaming: use message/send and emit result as SSE events
                resp = await send_message(agent_url, body.message, context_id, headers=agent_headers)
                result = resp.get("result", {})
                task_id = result.get("taskId")

                # Update contextId if the agent returned one (important for Kibana)
                returned_context = result.get("contextId")
                if returned_context and returned_context != context_id:
                    async with async_session() as ctx_db:
                        from sqlalchemy import update
                        await ctx_db.execute(
                            update(Conversation)
                            .where(Conversation.id == conversation_id)
                            .values(context_id=returned_context)
                        )
                        await ctx_db.commit()

                # Collect ALL parts from the response
                all_parts: list[dict] = []
                parts = result.get("parts", [])
                all_parts.extend(parts)

                artifacts = result.get("artifacts", [])
                for artifact in artifacts:
                    all_parts.extend(artifact.get("parts", []))

                collected_parts = all_parts

                # Emit the full response as a single SSE event with all parts
                if collected_parts:
                    synth_event = {
                        "jsonrpc": "2.0",
                        "result": {
                            "kind": "artifact-update",
                            "artifact": {
                                "parts": collected_parts,
                            },
                            "taskId": task_id,
                        },
                    }
                    yield f"data: {json.dumps(synth_event)}\n\n"

        except Exception as e:
            error_event = {"error": str(e)}
            yield f"data: {json.dumps(error_event)}\n\n"
            collected_parts = [{"kind": "text", "text": f"[Error communicating with agent: {e}]"}]

        # Derive text for backward compatibility
        collected_text = "".join(
            p.get("text", "") for p in collected_parts
            if p.get("kind") == "text" or "text" in p
        )

        # Save agent response to DB after stream/send completes
        if collected_parts:
            async with async_session() as save_db:
                agent_msg = Message(
                    conversation_id=conversation_id,
                    role="agent",
                    content=collected_text,
                    parts_json=json.dumps(collected_parts),
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
