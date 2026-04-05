import { useState, useCallback, useRef } from 'react';
import type { Message } from '../types';
import { getConversation, sendMessage as sendChatMessage } from '../api/client';

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
      // Optimistically add user message
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
            if (event.type === 'artifact') {
              try {
                const parsed = JSON.parse(event.data);
                const parts = parsed.data?.parts ?? parsed.parts ?? [];
                for (const part of parts) {
                  if (part.type === 'text' && part.text) {
                    accumulated += part.text;
                    setStreamingContent(accumulated);
                  }
                }
              } catch {
                // ignore parse errors
              }
            } else if (event.type === 'raw') {
              // Fallback: treat raw data as text content
              accumulated += event.data;
              setStreamingContent(accumulated);
            } else if (event.type === 'done') {
              // Stream finished
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

      // Add final agent message
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
