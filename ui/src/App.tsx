import { useState, useEffect, useCallback } from 'react';
import {
  EuiProvider,
  EuiPageTemplate,
  EuiHeader,
  EuiHeaderSection,
  EuiHeaderSectionItem,
  EuiTitle,
  EuiButtonIcon,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiShowFor,
  EuiHideFor,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
} from '@elastic/eui';
import { css } from '@emotion/react';

import type { Agent, Conversation } from './types';
import {
  getAgents,
  getConversations,
  createConversation,
  deleteConversation,
} from './api/client';
import { useChat } from './hooks/useChat';
import { ChatView } from './components/ChatView';
import { ConversationList } from './components/ConversationList';
import { AgentConfigModal } from './components/AgentConfigModal';

const THEME_KEY = 'hermes-a2a-theme';

function getInitialTheme(): 'light' | 'dark' {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function App() {
  const [colorMode, setColorMode] = useState<'light' | 'dark'>(getInitialTheme);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [showAgentConfig, setShowAgentConfig] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const {
    messages,
    isStreaming,
    streamingContent,
    sendMessage,
    loadConversation,
  } = useChat();

  const toggleTheme = () => {
    const next = colorMode === 'dark' ? 'light' : 'dark';
    setColorMode(next);
    localStorage.setItem(THEME_KEY, next);
  };

  // Load agents
  const refreshAgents = useCallback(async () => {
    try {
      const data = await getAgents();
      setAgents(data);
      if (data.length > 0 && !selectedAgentId) {
        setSelectedAgentId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load agents:', err);
    }
  }, [selectedAgentId]);

  // Load conversations
  const refreshConversations = useCallback(async () => {
    try {
      const data = await getConversations();
      setConversations(data);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  }, []);

  useEffect(() => {
    refreshAgents();
    refreshConversations();
  }, [refreshAgents, refreshConversations]);

  // Select a conversation
  const handleSelectConversation = useCallback(
    async (id: string) => {
      setActiveConversationId(id);
      setMobileSidebarOpen(false);
      await loadConversation(id);
    },
    [loadConversation],
  );

  // New chat
  const handleNewChat = useCallback(async () => {
    if (!selectedAgentId) return;
    try {
      const convo = await createConversation(selectedAgentId);
      await refreshConversations();
      setActiveConversationId(convo.id);
      await loadConversation(convo.id);
      setMobileSidebarOpen(false);
    } catch (err) {
      console.error('Failed to create conversation:', err);
    }
  }, [selectedAgentId, refreshConversations, loadConversation]);

  // Delete conversation
  const handleDeleteConversation = useCallback(
    async (id: string) => {
      try {
        await deleteConversation(id);
        if (activeConversationId === id) {
          setActiveConversationId(null);
        }
        await refreshConversations();
      } catch (err) {
        console.error('Failed to delete conversation:', err);
      }
    },
    [activeConversationId, refreshConversations],
  );

  // Send message
  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!activeConversationId) return;
      await sendMessage(activeConversationId, text);
      // Refresh conversations to update titles/timestamps
      refreshConversations();
    },
    [activeConversationId, sendMessage, refreshConversations],
  );

  const sidebar = (
    <ConversationList
      conversations={conversations}
      agents={agents}
      selectedAgentId={selectedAgentId}
      activeConversationId={activeConversationId}
      onSelectAgent={setSelectedAgentId}
      onNewChat={handleNewChat}
      onSelectConversation={handleSelectConversation}
      onDeleteConversation={handleDeleteConversation}
      onOpenAgentConfig={() => setShowAgentConfig(true)}
    />
  );

  return (
    <EuiProvider colorMode={colorMode}>
      <div
        css={css`
          display: flex;
          flex-direction: column;
          height: 100vh;
          overflow: hidden;
        `}
      >
        {/* Header */}
        <EuiHeader
          position="fixed"
          css={css`
            flex: 0 0 auto;
          `}
        >
          <EuiHeaderSection>
            <EuiHeaderSectionItem>
              <EuiShowFor sizes={['xs', 's']}>
                <EuiButtonIcon
                  iconType="menu"
                  aria-label="Toggle sidebar"
                  onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                  display="empty"
                  size="m"
                  css={css`margin-right: 8px;`}
                />
              </EuiShowFor>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="compute" size="l" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiTitle size="xs">
                    <h1>Hermes A2A</h1>
                  </EuiTitle>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiHeaderSectionItem>
          </EuiHeaderSection>
          <EuiHeaderSection>
            <EuiHeaderSectionItem>
              <EuiButtonIcon
                iconType={colorMode === 'dark' ? 'sun' : 'moon'}
                aria-label="Toggle theme"
                onClick={toggleTheme}
                display="empty"
                size="m"
              />
            </EuiHeaderSectionItem>
          </EuiHeaderSection>
        </EuiHeader>

        {/* Body */}
        <div
          css={css`
            display: flex;
            flex: 1 1 auto;
            min-height: 0;
            margin-top: 48px; /* header height */
          `}
        >
          {/* Desktop sidebar */}
          <EuiHideFor sizes={['xs', 's']}>
            <EuiPageTemplate.Sidebar
              sticky
              css={css`
                width: 280px;
                min-width: 280px;
                border-right: 1px solid var(--euiColorLightShade, #d3dae6);
                height: 100%;
                overflow: hidden;
              `}
            >
              {sidebar}
            </EuiPageTemplate.Sidebar>
          </EuiHideFor>

          {/* Mobile sidebar flyout */}
          {mobileSidebarOpen && (
            <EuiShowFor sizes={['xs', 's']}>
              <EuiFlyout
                ownFocus
                onClose={() => setMobileSidebarOpen(false)}
                size="s"
                side="left"
              >
                <EuiFlyoutHeader hasBorder>
                  <EuiTitle size="xs">
                    <h2>Conversations</h2>
                  </EuiTitle>
                </EuiFlyoutHeader>
                <EuiFlyoutBody>{sidebar}</EuiFlyoutBody>
              </EuiFlyout>
            </EuiShowFor>
          )}

          {/* Main chat area */}
          <div
            css={css`
              flex: 1 1 auto;
              min-width: 0;
              display: flex;
              flex-direction: column;
              height: 100%;
            `}
          >
            <ChatView
              messages={messages}
              isStreaming={isStreaming}
              streamingContent={streamingContent}
              onSendMessage={handleSendMessage}
              activeConversationId={activeConversationId}
            />
          </div>
        </div>

        {/* Agent config modal */}
        {showAgentConfig && (
          <AgentConfigModal
            agents={agents}
            onClose={() => setShowAgentConfig(false)}
            onAgentsChanged={() => {
              refreshAgents();
              setShowAgentConfig(false);
            }}
          />
        )}
      </div>
    </EuiProvider>
  );
}

export default App;
