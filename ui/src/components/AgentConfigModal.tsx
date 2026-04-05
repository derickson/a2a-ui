import { useState, useEffect } from 'react';
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
  EuiSelect,
  EuiFieldPassword,
  EuiAccordion,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { Agent, AgentCard, ElasticAgent } from '../types';
import {
  discoverAgent,
  addAgent,
  deleteAgent,
  getConfig,
  getElasticAgents,
  importElasticAgent,
} from '../api/client';

interface AgentConfigModalProps {
  agents: Agent[];
  onClose: () => void;
  onAgentsChanged: () => void;
}

const AUTH_OPTIONS = [
  { value: 'none', text: 'None' },
  { value: 'bearer', text: 'Bearer Token' },
  { value: 'apikey', text: 'API Key' },
  { value: 'basic', text: 'Basic Auth' },
];

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

  // Auth state
  const [authType, setAuthType] = useState<string>('none');
  const [bearerToken, setBearerToken] = useState('');
  const [apiKeyHeader, setApiKeyHeader] = useState('Authorization');
  const [apiKeyValue, setApiKeyValue] = useState('');
  const [basicUser, setBasicUser] = useState('');
  const [basicPass, setBasicPass] = useState('');
  const [customHeaders, setCustomHeaders] = useState<Array<{key: string, value: string}>>([]);

  // Elastic agent discovery
  const [elasticEnabled, setElasticEnabled] = useState(false);
  const [elasticAgents, setElasticAgents] = useState<ElasticAgent[]>([]);
  const [loadingElastic, setLoadingElastic] = useState(false);

  useEffect(() => {
    getConfig()
      .then((cfg) => setElasticEnabled(cfg.elastic_enabled))
      .catch(() => {/* config not available */});
  }, []);

  function buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    switch (authType) {
      case 'bearer': if (bearerToken) headers['Authorization'] = `Bearer ${bearerToken}`; break;
      case 'apikey': if (apiKeyValue) headers[apiKeyHeader || 'Authorization'] = apiKeyValue; break;
      case 'basic': if (basicUser && basicPass) headers['Authorization'] = `Basic ${btoa(`${basicUser}:${basicPass}`)}`; break;
    }
    customHeaders.forEach(h => { if (h.key && h.value) headers[h.key] = h.value; });
    return headers;
  }

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
      const headers = buildHeaders();
      await addAgent(url.trim(), Object.keys(headers).length > 0 ? headers : undefined);
      setUrl('');
      setCard(null);
      setAuthType('none');
      setBearerToken('');
      setApiKeyHeader('Authorization');
      setApiKeyValue('');
      setBasicUser('');
      setBasicPass('');
      setCustomHeaders([]);
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

  const handleRefreshElastic = async () => {
    setLoadingElastic(true);
    try {
      const agents = await getElasticAgents();
      setElasticAgents(agents);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingElastic(false);
    }
  };

  const handleImportElastic = async (agentId: string) => {
    try {
      await importElasticAgent(agentId);
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
                        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                          <EuiFlexItem grow={false}>
                            <EuiText size="s">
                              <strong>{a.name}</strong>
                            </EuiText>
                          </EuiFlexItem>
                          {a.headers_json && Object.keys(a.headers_json).length > 0 && (
                            <EuiFlexItem grow={false}>
                              <EuiBadge
                                iconType="lock"
                                color="hollow"
                                css={css`font-size: 10px;`}
                              >
                                Auth
                              </EuiBadge>
                            </EuiFlexItem>
                          )}
                        </EuiFlexGroup>
                        <EuiText size="xs">
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

        {/* Authentication & Headers */}
        <EuiSpacer size="m" />
        <EuiAccordion
          id="auth-headers-accordion"
          buttonContent="Authentication & Headers"
          paddingSize="m"
        >
          <EuiFormRow label="Auth Type">
            <EuiSelect
              options={AUTH_OPTIONS}
              value={authType}
              onChange={(e) => setAuthType(e.target.value)}
            />
          </EuiFormRow>

          {authType === 'bearer' && (
            <>
              <EuiSpacer size="s" />
              <EuiFormRow label="Bearer Token">
                <EuiFieldPassword
                  type="dual"
                  fullWidth
                  value={bearerToken}
                  onChange={(e) => setBearerToken(e.target.value)}
                  placeholder="Enter token"
                />
              </EuiFormRow>
            </>
          )}

          {authType === 'apikey' && (
            <>
              <EuiSpacer size="s" />
              <EuiFormRow label="Header Name">
                <EuiFieldText
                  fullWidth
                  value={apiKeyHeader}
                  onChange={(e) => setApiKeyHeader(e.target.value)}
                  placeholder="Authorization"
                />
              </EuiFormRow>
              <EuiSpacer size="s" />
              <EuiFormRow label="API Key Value">
                <EuiFieldPassword
                  type="dual"
                  fullWidth
                  value={apiKeyValue}
                  onChange={(e) => setApiKeyValue(e.target.value)}
                  placeholder="Enter API key"
                />
              </EuiFormRow>
            </>
          )}

          {authType === 'basic' && (
            <>
              <EuiSpacer size="s" />
              <EuiFormRow label="Username">
                <EuiFieldText
                  fullWidth
                  value={basicUser}
                  onChange={(e) => setBasicUser(e.target.value)}
                  placeholder="Username"
                />
              </EuiFormRow>
              <EuiSpacer size="s" />
              <EuiFormRow label="Password">
                <EuiFieldPassword
                  type="dual"
                  fullWidth
                  value={basicPass}
                  onChange={(e) => setBasicPass(e.target.value)}
                  placeholder="Password"
                />
              </EuiFormRow>
            </>
          )}

          <EuiSpacer size="m" />
          <EuiText size="xs"><strong>Custom Headers</strong></EuiText>
          <EuiSpacer size="xs" />
          {customHeaders.map((header, idx) => (
            <div key={idx} css={css`margin-bottom: 4px;`}>
              <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
                <EuiFlexItem>
                  <EuiFieldText
                    compressed
                    placeholder="Header name"
                    value={header.key}
                    onChange={(e) => {
                      const updated = [...customHeaders];
                      updated[idx] = { ...updated[idx], key: e.target.value };
                      setCustomHeaders(updated);
                    }}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFieldText
                    compressed
                    placeholder="Value"
                    value={header.value}
                    onChange={(e) => {
                      const updated = [...customHeaders];
                      updated[idx] = { ...updated[idx], value: e.target.value };
                      setCustomHeaders(updated);
                    }}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    iconType="cross"
                    aria-label="Remove header"
                    color="danger"
                    size="s"
                    onClick={() => {
                      setCustomHeaders(customHeaders.filter((_, i) => i !== idx));
                    }}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </div>
          ))}
          <EuiSpacer size="xs" />
          <EuiButtonEmpty
            size="xs"
            iconType="plus"
            onClick={() => setCustomHeaders([...customHeaders, { key: '', value: '' }])}
          >
            Add Header
          </EuiButtonEmpty>
        </EuiAccordion>

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

        {/* Elastic Agent Discovery */}
        {elasticEnabled && (
          <>
            <EuiHorizontalRule margin="m" />
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>Elastic Agent Builder</strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="refresh"
                  aria-label="Refresh elastic agents"
                  onClick={handleRefreshElastic}
                  isLoading={loadingElastic}
                  size="s"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            {loadingElastic && (
              <EuiFlexGroup justifyContent="center">
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner size="m" />
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
            {!loadingElastic && elasticAgents.length === 0 && (
              <EuiText size="xs" color="subdued">
                Click refresh to discover agents from Elastic Agent Builder.
              </EuiText>
            )}
            {!loadingElastic && elasticAgents.length > 0 && (
              <div>
                {elasticAgents.map((ea) => (
                  <EuiFlexGroup
                    key={ea.id}
                    gutterSize="s"
                    alignItems="center"
                    responsive={false}
                    css={css`margin-bottom: 8px;`}
                  >
                    <EuiFlexItem>
                      <EuiText size="s">
                        <strong>{ea.name}</strong>
                      </EuiText>
                      <EuiText size="xs" color="subdued">
                        {ea.description}
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButton
                        size="s"
                        iconType="importAction"
                        onClick={() => handleImportElastic(ea.id)}
                      >
                        Import
                      </EuiButton>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                ))}
              </div>
            )}
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
