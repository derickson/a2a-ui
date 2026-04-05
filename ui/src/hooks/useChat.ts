import { useState, useCallback, useRef } from 'react';
import type { Message, A2APart, TextPart } from '../types';
import { getConversation, sendMessage as sendChatMessage } from '../api/client';

function extractPartsFromEvent(data: string): A2APart[] {
  try {
    const parsed = JSON.parse(data);
    const result = parsed.result;
    if (!result) return [];

    if (result.kind === 'artifact-update' && result.artifact) {
      return result.artifact.parts ?? [];
    }

    if (result.kind === 'status-update' && result.status?.message) {
      return result.status.message.parts ?? [];
    }

    return [];
  } catch {
    return [];
  }
}

function textFromParts(parts: A2APart[]): string {
  return parts
    .filter((p): p is TextPart => p.kind === 'text')
    .map((p) => p.text)
    .join('');
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
      let accumulatedParts: A2APart[] = [];

      try {
        await sendChatMessage(
          conversationId,
          text,
          (event) => {
            if (event.type === 'done') return;

            const newParts = extractPartsFromEvent(event.data);
            if (newParts.length > 0) {
              for (const part of newParts) {
                const last = accumulatedParts[accumulatedParts.length - 1];
                if (part.kind === 'text' && last && last.kind === 'text') {
                  last.text += part.text;
                } else {
                  accumulatedParts.push(part);
                }
              }
              accumulated = textFromParts(accumulatedParts);
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

      if (accumulated || accumulatedParts.length > 0) {
        const agentMessage: Message = {
          id: `temp-agent-${Date.now()}`,
          conversation_id: conversationId,
          role: 'agent',
          content: accumulated,
          parts: accumulatedParts.length > 0 ? accumulatedParts : undefined,
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
