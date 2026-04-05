"""A2A JSON-RPC 2.0 client using httpx."""

import json
import uuid
from collections.abc import AsyncGenerator

import httpx


async def fetch_agent_card(base_url: str) -> dict:
    """GET {base_url}/.well-known/agent-card.json and return parsed JSON."""
    url = f"{base_url.rstrip('/')}/.well-known/agent-card.json"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.json()


async def send_message(
    agent_url: str, message: str, context_id: str | None = None
) -> dict:
    """Send a JSON-RPC message/send request and return the parsed response."""
    payload = {
        "jsonrpc": "2.0",
        "method": "message/send",
        "params": {
            "message": {
                "role": "user",
                "parts": [{"text": message}],
                "messageId": str(uuid.uuid4()),
            },
        },
        "id": str(uuid.uuid4()),
    }
    if context_id:
        payload["params"]["contextId"] = context_id

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(agent_url, json=payload)
        resp.raise_for_status()
        return resp.json()


async def stream_message(
    agent_url: str, message: str, context_id: str | None = None
) -> AsyncGenerator[dict, None]:
    """Send a JSON-RPC message/stream request and yield parsed SSE events."""
    payload = {
        "jsonrpc": "2.0",
        "method": "message/stream",
        "params": {
            "message": {
                "role": "user",
                "parts": [{"text": message}],
                "messageId": str(uuid.uuid4()),
            },
        },
        "id": str(uuid.uuid4()),
    }
    if context_id:
        payload["params"]["contextId"] = context_id

    async with httpx.AsyncClient(timeout=300.0) as client:
        async with client.stream("POST", agent_url, json=payload) as resp:
            resp.raise_for_status()
            buffer = ""
            async for chunk in resp.aiter_text():
                buffer += chunk
                while "\n" in buffer:
                    line, buffer = buffer.split("\n", 1)
                    line = line.strip()
                    if line.startswith("data:"):
                        data_str = line[len("data:"):].strip()
                        if data_str:
                            try:
                                yield json.loads(data_str)
                            except json.JSONDecodeError:
                                pass
            # Process any remaining data in buffer
            if buffer.strip().startswith("data:"):
                data_str = buffer.strip()[len("data:"):].strip()
                if data_str:
                    try:
                        yield json.loads(data_str)
                    except json.JSONDecodeError:
                        pass
