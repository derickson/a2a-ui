export interface AgentCard {
  name: string;
  description: string;
  url: string;
  protocolVersion: string;
  capabilities: {
    streaming: boolean;
    stateTransitionHistory: boolean;
    pushNotifications: boolean;
  };
  skills: Array<{
    id: string;
    name: string;
    description: string;
    tags: string[];
    examples: string[];
  }>;
  defaultInputModes: string[];
  defaultOutputModes: string[];
  version: string;
}

export interface Agent {
  id: string;
  name: string;
  url: string;
  description: string;
  card_json: string;
  headers_json: Record<string, string>;
  created_at: string;
}

export interface Conversation {
  id: string;
  agent_id: string;
  title: string;
  context_id: string;
  created_at: string;
  updated_at: string;
  agent?: Agent;
  messages?: Message[];
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'agent';
  content: string;
  task_id: string | null;
  created_at: string;
}

export interface StreamEvent {
  type: 'status' | 'artifact' | 'error' | 'done';
  data: Record<string, unknown>;
}

export interface ElasticAgent {
  id: string;
  name: string;
  description: string;
}

export interface KibanaServer {
  id: string;
  name: string;
  url: string;
  created_at: string;
}

export interface AppConfig {
  elastic_enabled: boolean;
  base_path: string;
}
