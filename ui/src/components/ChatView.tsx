import { useState, useRef, useEffect } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
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

export function ChatView({
  messages,
  isStreaming,
  streamingContent,
  onSendMessage,
  activeConversationId,
}: ChatViewProps) {
  const [inputValue, setInputValue] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

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

  // Empty state — no conversation selected
  if (!activeConversationId) {
    return (
      <div
        css={css`
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
        `}
      >
        <EuiEmptyPrompt
          iconType="discuss"
          title={<h2>A2A UI</h2>}
          body={<p>Select a conversation or start a new chat to begin.</p>}
        />
      </div>
    );
  }

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 0;
      `}
    >
      {/* Messages area */}
      <div
        css={css`
          flex: 1 1 auto;
          overflow-y: auto;
          padding: 24px 16px;
          min-height: 0;
        `}
      >
        <div
          css={css`
            max-width: 800px;
            margin: 0 auto;
          `}
        >
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
            <EuiFlexGroup
              gutterSize="s"
              alignItems="center"
              css={css`
                margin-bottom: 16px;
                padding-left: 4px;
              `}
            >
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="m" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <span css={css`opacity: 0.5; font-size: 13px;`}>
                  Agent is thinking...
                </span>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input area */}
      <div
        css={css`
          flex: 0 0 auto;
          padding: 12px 16px 16px;
          border-top: 1px solid var(--euiColorLightShade);
        `}
      >
        <div
          css={css`
            max-width: 800px;
            margin: 0 auto;
          `}
        >
          <EuiPanel
            hasShadow={false}
            hasBorder
            paddingSize="none"
            css={css`
              display: flex;
              align-items: center;
              border-radius: 24px;
              padding: 4px 4px 4px 16px;
            `}
          >
            <EuiFieldText
              fullWidth
              placeholder={isStreaming ? 'Waiting for response...' : 'Type a message...'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
              aria-label="Message input"
              css={css`
                .euiFieldText {
                  border: none;
                  box-shadow: none;
                  background: transparent;
                  padding-left: 0;
                }
              `}
            />
            <EuiButtonIcon
              iconType="arrowRight"
              aria-label="Send message"
              onClick={handleSend}
              isDisabled={isStreaming || !inputValue.trim()}
              display="fill"
              color="primary"
              size="m"
              css={css`
                border-radius: 50%;
                min-width: 36px;
                min-height: 36px;
                flex-shrink: 0;
              `}
            />
          </EuiPanel>
          {isStreaming && (
            <EuiFlexGroup justifyContent="center" css={css`margin-top: 6px;`}>
              <EuiFlexItem grow={false}>
                <button
                  onClick={() => {/* cancel handled by parent if needed */}}
                  css={css`
                    background: none;
                    border: none;
                    cursor: pointer;
                    opacity: 0.5;
                    font-size: 12px;
                    color: inherit;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    &:hover { opacity: 0.8; }
                  `}
                >
                  <EuiIcon type="stop" size="s" /> Stop generating
                </button>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </div>
      </div>
    </div>
  );
}
