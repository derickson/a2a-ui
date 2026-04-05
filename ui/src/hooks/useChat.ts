import { useState, useCallback, useRef } from 'react';
import type { Message } from '../types';
import { getConversation, sendMessage as sendChatMessage } from '../api/client';

function extractTextFromEvent(data: string): string {
  try {
    const parsed = JSON.parse(data);
    const result = parsed.result;
    if (!result) return '';

    // Handle artifact-update events
    if (result.kind === 'artifact-update' && result.artifact) {
      const parts = result.artifact.parts ?? [];
      return parts
        .filter((p: Record<string, unknown>) => p.kind === 'text' || 'text' in p)
        .map((p: Record<string, unknown>) => p.text ?? '')
        .join('');
    }

    // Handle status-update with message parts
    if (result.kind === 'status-update' && result.status?.message) {
      const parts = result.status.message.parts ?? [];
      return parts
        .filter((p: Record<string, unknown>) => p.kind === 'text' || 'text' in p)
        .map((p: Record<string, unknown>) => p.text ?? '')
        .join('');
    }

    return '';
  } catch {
    return '';
  }
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const loadConversation = useCallback(async (id: string) => {
    const convo = await getConversation(id);
    setMessages(convo.messages ?? []);
    setStreamingContent('');
    setIsStreaming(false);
  }, []);

  const sendMessage = useCallback(
    async (conversationId: string, text: string) => {
      const userMessage: Message = {
        id: `temp-${Date.now()}`,
        conversation_id: conversationId,
        role: 'user',
        content: text,
        task_id: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsStreaming(true);
      setStreamingContent('');

      const controller = new AbortController();
      abortRef.current = controller;

      let accumulated = '';

      try {
        await sendChatMessage(
          conversationId,
          text,
          (event) => {
            if (event.type === 'done') return;

            const chunk = extractTextFromEvent(event.data);
            if (chunk) {
              accumulated += chunk;
              setStreamingContent(accumulated);
            }
          },
          controller.signal,
        );
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Chat error:', err);
          accumulated = accumulated || `Error: ${(err as Error).message}`;
        }
      }

      if (accumulated) {
        const agentMessage: Message = {
          id: `temp-agent-${Date.now()}`,
          conversation_id: conversationId,
          role: 'agent',
          content: accumulated,
          task_id: null,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, agentMessage]);
      }

      setStreamingContent('');
      setIsStreaming(false);
      abortRef.current = null;
    },
    [],
  );

  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
    setStreamingContent('');
  }, []);

  return {
    messages,
    isStreaming,
    streamingContent,
    sendMessage,
    loadConversation,
    cancelStream,
  };
}
