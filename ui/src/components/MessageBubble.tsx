import { EuiPanel, EuiText, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import type { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

const userBubbleStyle = css`
  background: #0077cc;
  color: #fff;
  border-radius: 12px 12px 2px 12px;
  max-width: 75%;
  word-wrap: break-word;
  white-space: pre-wrap;
`;

const agentBubbleStyle = css`
  border-radius: 12px 12px 12px 2px;
  max-width: 75%;
  word-wrap: break-word;
  white-space: pre-wrap;
`;

const timestampStyle = css`
  font-size: 11px;
  opacity: 0.6;
  margin-top: 2px;
`;

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
    <EuiFlexGroup
      justifyContent={isUser ? 'flexEnd' : 'flexStart'}
      gutterSize="none"
      css={css`
        margin-bottom: 12px;
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiPanel
          paddingSize="m"
          hasShadow={false}
          hasBorder={!isUser}
          css={isUser ? userBubbleStyle : agentBubbleStyle}
        >
          <EuiText size="s">
            <p style={{ margin: 0 }}>{message.content}{isStreaming && <span className="cursor-blink">|</span>}</p>
          </EuiText>
        </EuiPanel>
        <EuiText
          css={timestampStyle}
          textAlign={isUser ? 'right' : 'left'}
        >
          {formatTime(message.created_at)}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
