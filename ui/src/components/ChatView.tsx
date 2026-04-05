import { useState, useRef, useEffect } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiIcon,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { Message } from '../types';
import { MessageBubble } from './MessageBubble';

interface ChatViewProps {
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;
  onSendMessage: (text: string) => void;
  activeConversationId: string | null;
}

const containerStyle = css`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
`;

const messagesAreaStyle = css`
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 16px 24px;
  min-height: 0;
`;

const inputAreaStyle = css`
  flex: 0 0 auto;
  padding: 12px 24px;
  border-top: 1px solid var(--euiColorLightShade, #d3dae6);
`;

export function ChatView({
  messages,
  isStreaming,
  streamingContent,
  onSendMessage,
  activeConversationId,
}: ChatViewProps) {
  const [inputValue, setInputValue] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change or streaming content updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isStreaming || !activeConversationId) return;
    setInputValue('');
    onSendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!activeConversationId) {
    return (
      <div css={containerStyle}>
        <EuiFlexGroup
          alignItems="center"
          justifyContent="center"
          css={css`
            flex: 1;
          `}
        >
          <EuiFlexItem grow={false}>
            <EuiEmptyPrompt
              iconType="discuss"
              title={<h2>Hermes A2A Chat</h2>}
              body={<p>Select a conversation or start a new chat to begin.</p>}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    );
  }

  return (
    <div css={containerStyle}>
      <div css={messagesAreaStyle}>
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isStreaming && streamingContent && (
          <MessageBubble
            message={{
              id: 'streaming',
              conversation_id: activeConversationId,
              role: 'agent',
              content: streamingContent,
              task_id: null,
              created_at: new Date().toISOString(),
            }}
            isStreaming
          />
        )}
        {isStreaming && !streamingContent && (
          <EuiFlexGroup gutterSize="s" alignItems="center" css={css`margin-bottom: 12px;`}>
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="m" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <span style={{ opacity: 0.6, fontSize: 13 }}>Agent is thinking...</span>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
        <div ref={bottomRef} />
      </div>

      <div css={inputAreaStyle}>
        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <EuiFieldText
              fullWidth
              placeholder={isStreaming ? 'Waiting for response...' : 'Type a message...'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
              aria-label="Message input"
              append={
                <EuiButtonIcon
                  iconType="arrowRight"
                  aria-label="Send message"
                  onClick={handleSend}
                  isDisabled={isStreaming || !inputValue.trim()}
                  display="fill"
                  color="primary"
                  size="m"
                />
              }
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        {isStreaming && (
          <EuiFlexGroup justifyContent="center" css={css`margin-top: 4px;`}>
            <EuiFlexItem grow={false}>
              <button
                onClick={() => {/* cancel handled by parent if needed */}}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  opacity: 0.6,
                  fontSize: 12,
                }}
              >
                <EuiIcon type="stop" size="s" /> Stop generating
              </button>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </div>
    </div>
  );
}
