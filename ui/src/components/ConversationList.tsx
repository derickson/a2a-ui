import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroup,
  EuiListGroupItem,
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

const sidebarStyle = css`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 12px;
`;

const listContainerStyle = css`
  flex: 1 1 auto;
  overflow-y: auto;
  min-height: 0;
`;

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
    <div css={sidebarStyle}>
      <EuiFlexGroup gutterSize="s" responsive={false}>
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

      <EuiSpacer size="s" />

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

      <div css={listContainerStyle}>
        {conversations.length === 0 ? (
          <EuiText size="s" color="subdued" textAlign="center">
            <p>No conversations yet</p>
          </EuiText>
        ) : (
          <EuiListGroup flush gutterSize="none" maxWidth={false}>
            {conversations.map((c) => (
              <EuiListGroupItem
                key={c.id}
                label={
                  <EuiFlexGroup
                    gutterSize="xs"
                    alignItems="center"
                    responsive={false}
                  >
                    <EuiFlexItem>
                      <EuiText size="xs" css={css`line-height: 1.3;`}>
                        <strong>{c.title || 'Untitled'}</strong>
                        <br />
                        <span style={{ opacity: 0.6, fontSize: 11 }}>
                          {formatDate(c.updated_at)}
                        </span>
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
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
                    </EuiFlexItem>
                  </EuiFlexGroup>
                }
                onClick={() => onSelectConversation(c.id)}
                isActive={c.id === activeConversationId}
                size="s"
              />
            ))}
          </EuiListGroup>
        )}
      </div>
    </div>
  );
}
