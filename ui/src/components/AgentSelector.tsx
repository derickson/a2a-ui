import { EuiSelect } from '@elastic/eui';
import type { Agent } from '../types';

interface AgentSelectorProps {
  agents: Agent[];
  selectedAgentId: string;
  onChange: (agentId: string) => void;
}

export function AgentSelector({
  agents,
  selectedAgentId,
  onChange,
}: AgentSelectorProps) {
  const options = [
    { value: '', text: '-- Select an agent --' },
    ...agents.map((a) => ({ value: a.id, text: a.name })),
  ];

  return (
    <EuiSelect
      fullWidth
      options={options}
      value={selectedAgentId}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Select agent"
      compressed
    />
  );
}
