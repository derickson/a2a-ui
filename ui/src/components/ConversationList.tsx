import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiButtonIcon,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { Agent, Conversation } from '../types';
import { AgentSelector } from './AgentSelector';

interface ConversationListProps {
  conversations: Conversation[];
  agents: Agent[];
  selectedAgentId: string;
  activeConversationId: string | null;
  onSelectAgent: (agentId: string) => void;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onOpenAgentConfig: () => void;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export function ConversationList({
  conversations,
  agents,
  selectedAgentId,
  activeConversationId,
  onSelectAgent,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onOpenAgentConfig,
}: ConversationListProps) {
  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        height: 100%;
        padding: 16px;
        overflow: hidden;
      `}
    >
      {/* Agent selector + gear — don't grow */}
      <div css={css`flex: 0 0 auto;`}>
        <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
          <EuiFlexItem>
            <AgentSelector
              agents={agents}
              selectedAgentId={selectedAgentId}
              onChange={onSelectAgent}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip content="Manage agents">
              <EuiButtonIcon
                iconType="gear"
                aria-label="Manage agents"
                onClick={onOpenAgentConfig}
                display="base"
                size="m"
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        <EuiButton
          fullWidth
          fill
          iconType="plus"
          onClick={onNewChat}
          isDisabled={!selectedAgentId}
          size="s"
        >
          New Chat
        </EuiButton>

        <EuiSpacer size="m" />
      </div>

      {/* Conversation list — fills remaining space */}
      <div
        css={css`
          flex: 1 1 auto;
          overflow-y: auto;
          min-height: 0;
          margin: 0 -8px;
          padding: 0 4px;
        `}
      >
        {conversations.length === 0 ? (
          <EuiText size="s" color="subdued" textAlign="center" css={css`padding-top: 24px;`}>
            <p>No conversations yet</p>
          </EuiText>
        ) : (
          conversations.map((c) => {
            const isActive = c.id === activeConversationId;
            return (
              <button
                key={c.id}
                onClick={() => onSelectConversation(c.id)}
                css={css`
                  display: flex;
                  align-items: center;
                  width: 100%;
                  text-align: left;
                  padding: 10px 12px;
                  margin-bottom: 2px;
                  border: none;
                  border-radius: 8px;
                  cursor: pointer;
                  background: ${isActive ? 'var(--euiColorLightShade)' : 'transparent'};
                  color: inherit;
                  transition: background 0.15s;
                  &:hover {
                    background: var(--euiColorLightShade);
                  }
                  &:hover .delete-btn {
                    opacity: 1;
                  }
                `}
              >
                <div css={css`flex: 1; min-width: 0;`}>
                  <div
                    css={css`
                      font-size: 13px;
                      font-weight: ${isActive ? 600 : 400};
                      white-space: nowrap;
                      overflow: hidden;
                      text-overflow: ellipsis;
                    `}
                  >
                    {c.title || 'Untitled'}
                  </div>
                  <div
                    css={css`
                      font-size: 11px;
                      opacity: 0.5;
                      margin-top: 2px;
                    `}
                  >
                    {c.agent?.name && (
                      <span>{c.agent.name} &middot; </span>
                    )}
                    {formatDate(c.updated_at)}
                  </div>
                </div>
                <div
                  className="delete-btn"
                  css={css`
                    opacity: 0;
                    transition: opacity 0.15s;
                    flex-shrink: 0;
                    margin-left: 4px;
                  `}
                >
                  <EuiButtonIcon
                    iconType="trash"
                    aria-label="Delete conversation"
                    color="danger"
                    size="xs"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      onDeleteConversation(c.id);
                    }}
                  />
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
