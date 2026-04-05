import { EuiPanel, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import type { Message } from '../types';
import { MessageContent } from './MessageContent';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      css={css`
        display: flex;
        justify-content: ${isUser ? 'flex-end' : 'flex-start'};
        margin-bottom: 16px;
      `}
    >
      <div
        css={css`
          max-width: 80%;
          min-width: 40px;
        `}
      >
        <EuiPanel
          paddingSize="m"
          hasShadow={false}
          hasBorder={!isUser}
          css={css`
            ${isUser
              ? `
                background: var(--euiColorPrimary);
                color: #fff;
                border-radius: 16px 16px 4px 16px;
              `
              : `
                border-radius: 16px 16px 16px 4px;
              `}
            word-wrap: break-word;
            overflow-wrap: break-word;
          `}
        >
          <EuiText size="s">
            {isUser ? (
              <p css={css`margin: 0; white-space: pre-wrap;`}>
                {message.content}
              </p>
            ) : (
              <div css={css`margin: 0;`}>
                <MessageContent content={message.content} />
                {isStreaming && (
                  <span
                    css={css`
                      display: inline-block;
                      width: 2px;
                      height: 1em;
                      background: currentColor;
                      margin-left: 2px;
                      vertical-align: text-bottom;
                      animation: blink 1s step-end infinite;
                      @keyframes blink {
                        50% { opacity: 0; }
                      }
                    `}
                  />
                )}
              </div>
            )}
          </EuiText>
        </EuiPanel>
        <div
          css={css`
            font-size: 11px;
            opacity: 0.45;
            margin-top: 4px;
            text-align: ${isUser ? 'right' : 'left'};
            padding: 0 8px;
          `}
        >
          {formatTime(message.created_at)}
        </div>
      </div>
    </div>
  );
}
