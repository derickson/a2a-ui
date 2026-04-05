import type { Agent, AgentCard, Conversation, Message } from '../types';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// Agents
export function getAgents(): Promise<Agent[]> {
  return request<Agent[]>('/agents');
}

export function addAgent(url: string): Promise<Agent> {
  return request<Agent>('/agents', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
}

export function deleteAgent(id: string): Promise<void> {
  return request<void>(`/agents/${id}`, { method: 'DELETE' });
}

export function discoverAgent(url: string): Promise<AgentCard> {
  return request<AgentCard>('/agents/discover', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
}

// Conversations
export function getConversations(): Promise<Conversation[]> {
  return request<Conversation[]>('/conversations');
}

export function getConversation(id: string): Promise<Conversation> {
  return request<Conversation>(`/conversations/${id}`);
}

export function createConversation(
  agentId: string,
  title?: string,
): Promise<Conversation> {
  return request<Conversation>('/conversations', {
    method: 'POST',
    body: JSON.stringify({ agent_id: agentId, title }),
  });
}

export function deleteConversation(id: string): Promise<void> {
  return request<void>(`/conversations/${id}`, { method: 'DELETE' });
}

// Chat — SSE streaming via POST
export async function sendMessage(
  conversationId: string,
  message: string,
  onEvent: (event: { type: string; data: string }) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${BASE}/chat/${conversationId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
    signal,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Chat error ${res.status}: ${body}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    // Keep incomplete last line in buffer
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data:')) {
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') {
          onEvent({ type: 'done', data: '' });
          return;
        }
        try {
          const parsed = JSON.parse(data);
          onEvent({ type: parsed.type ?? 'unknown', data });
        } catch {
          // Non-JSON data line — treat as raw text
          onEvent({ type: 'raw', data });
        }
      }
    }
  }
  // Stream ended without [DONE]
  onEvent({ type: 'done', data: '' });
}

// Re-export Message type for convenience
export type { Message };
