import { useState } from 'react';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFormRow,
  EuiSpacer,
  EuiCallOut,
  EuiDescriptionList,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
  EuiHorizontalRule,
  EuiListGroup,
  EuiListGroupItem,
  EuiButtonIcon,
} from '@elastic/eui';
import type { Agent, AgentCard } from '../types';
import { discoverAgent, addAgent, deleteAgent } from '../api/client';

interface AgentConfigModalProps {
  agents: Agent[];
  onClose: () => void;
  onAgentsChanged: () => void;
}

export function AgentConfigModal({
  agents,
  onClose,
  onAgentsChanged,
}: AgentConfigModalProps) {
  const [url, setUrl] = useState('');
  const [discovering, setDiscovering] = useState(false);
  const [adding, setAdding] = useState(false);
  const [card, setCard] = useState<AgentCard | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDiscover = async () => {
    setError(null);
    setCard(null);
    setDiscovering(true);
    try {
      const result = await discoverAgent(url.trim());
      setCard(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDiscovering(false);
    }
  };

  const handleAdd = async () => {
    setError(null);
    setAdding(true);
    try {
      await addAgent(url.trim());
      setUrl('');
      setCard(null);
      onAgentsChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAgent(id);
      onAgentsChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <EuiModal onClose={onClose} style={{ minWidth: 500 }}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>Manage Agents</EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        {/* Existing agents */}
        {agents.length > 0 && (
          <>
            <EuiText size="s">
              <strong>Registered Agents</strong>
            </EuiText>
            <EuiSpacer size="s" />
            <EuiListGroup flush>
              {agents.map((a) => (
                <EuiListGroupItem
                  key={a.id}
                  label={
                    <EuiFlexGroup
                      gutterSize="s"
                      alignItems="center"
                      responsive={false}
                    >
                      <EuiFlexItem>
                        <EuiText size="s">
                          <strong>{a.name}</strong>
                          <br />
                          <span style={{ opacity: 0.6, fontSize: 12 }}>
                            {a.url}
                          </span>
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButtonIcon
                          iconType="trash"
                          color="danger"
                          aria-label={`Delete ${a.name}`}
                          onClick={() => handleDelete(a.id)}
                          size="s"
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  }
                />
              ))}
            </EuiListGroup>
            <EuiHorizontalRule margin="m" />
          </>
        )}

        {/* Add new agent */}
        <EuiText size="s">
          <strong>Add New Agent</strong>
        </EuiText>
        <EuiSpacer size="s" />

        <EuiFormRow label="Agent URL">
          <EuiFlexGroup gutterSize="s" responsive={false}>
            <EuiFlexItem>
              <EuiFieldText
                fullWidth
                placeholder="http://agent-host:9000"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                onClick={handleDiscover}
                isDisabled={!url.trim() || discovering}
                isLoading={discovering}
                size="m"
              >
                Discover
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>

        {error && (
          <>
            <EuiSpacer size="s" />
            <EuiCallOut title="Error" color="danger" size="s">
              {error}
            </EuiCallOut>
          </>
        )}

        {card && (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut title="Agent Discovered" color="success" size="s">
              <EuiDescriptionList
                compressed
                listItems={[
                  { title: 'Name', description: card.name },
                  { title: 'Description', description: card.description },
                  { title: 'Version', description: card.version },
                  {
                    title: 'Skills',
                    description: (
                      <EuiFlexGroup gutterSize="xs" wrap>
                        {card.skills.map((s) => (
                          <EuiFlexItem grow={false} key={s.id}>
                            <EuiBadge>{s.name}</EuiBadge>
                          </EuiFlexItem>
                        ))}
                      </EuiFlexGroup>
                    ),
                  },
                ]}
              />
            </EuiCallOut>
          </>
        )}

        {discovering && (
          <>
            <EuiSpacer size="m" />
            <EuiFlexGroup justifyContent="center">
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="l" />
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose}>Cancel</EuiButtonEmpty>
        <EuiButton
          fill
          onClick={handleAdd}
          isDisabled={!url.trim() || adding}
          isLoading={adding}
        >
          Add Agent
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}
