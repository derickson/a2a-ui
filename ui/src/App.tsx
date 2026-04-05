import { useState, useEffect, useCallback } from 'react';
import {
  EuiProvider,
  EuiHeader,
  EuiHeaderSection,
  EuiHeaderSectionItem,
  EuiHeaderSectionItemButton,
  EuiTitle,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  useIsWithinBreakpoints,
  useEuiTheme,
} from '@elastic/eui';
import { css, Global } from '@emotion/react';

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

const THEME_KEY = 'a2a-ui-theme';

function getInitialTheme(): 'light' | 'dark' {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

const globalStyles = css`
  html, body, #root {
    margin: 0;
    padding: 0;
    height: 100%;
    overflow: hidden;
  }
`;

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

  const handleSelectConversation = useCallback(
    async (id: string) => {
      setActiveConversationId(id);
      setMobileSidebarOpen(false);
      await loadConversation(id);
    },
    [loadConversation],
  );

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

  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!activeConversationId) return;
      await sendMessage(activeConversationId, text);
      refreshConversations();
    },
    [activeConversationId, sendMessage, refreshConversations],
  );

  const isMobile = useIsWithinBreakpoints(['xs', 's']);
  const { euiTheme } = useEuiTheme();

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
      <Global styles={globalStyles} />
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
          css={css`
            flex: 0 0 auto;
          `}
        >
          <EuiHeaderSection grow={false}>
            {isMobile && (
              <EuiHeaderSectionItem>
                <EuiHeaderSectionItemButton
                  aria-label="Toggle sidebar"
                  onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                >
                  <EuiIcon type="menu" size="m" />
                </EuiHeaderSectionItemButton>
              </EuiHeaderSectionItem>
            )}
            <EuiHeaderSectionItem>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="compute" size="l" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiTitle size="xxs">
                    <h1>A2A UI</h1>
                  </EuiTitle>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiHeaderSectionItem>
          </EuiHeaderSection>
          <EuiHeaderSection grow={false}>
            <EuiHeaderSectionItem>
              <EuiHeaderSectionItemButton
                aria-label="Toggle theme"
                onClick={toggleTheme}
              >
                <EuiIcon type={colorMode === 'dark' ? 'sun' : 'moon'} size="m" />
              </EuiHeaderSectionItemButton>
            </EuiHeaderSectionItem>
          </EuiHeaderSection>
        </EuiHeader>

        {/* Body */}
        <div
          css={css`
            display: flex;
            flex: 1 1 auto;
            min-height: 0;
            overflow: hidden;
          `}
        >
          {/* Desktop sidebar */}
          {!isMobile && (
            <div
              css={css`
                width: 300px;
                min-width: 300px;
                border-right: ${euiTheme.border.thin};
                display: flex;
                flex-direction: column;
                overflow: hidden;
              `}
            >
              {sidebar}
            </div>
          )}

          {/* Mobile sidebar flyout */}
          {isMobile && mobileSidebarOpen && (
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
          )}

          {/* Main chat area */}
          <div
            css={css`
              flex: 1 1 auto;
              min-width: 0;
              display: flex;
              flex-direction: column;
              overflow: hidden;
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
