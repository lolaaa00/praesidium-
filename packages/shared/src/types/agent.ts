// ──────────────────────────────────────────
// Agent Types
// ──────────────────────────────────────────

export type AgentStatus = 'active' | 'suspended' | 'revoked';
export type AgentType = 'chatbot' | 'workflow' | 'autonomous' | 'tool_agent';

export interface Agent {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  agentType: AgentType;
  status: AgentStatus;
  apiKeyPrefix: string;
  metadata: Record<string, unknown>;
  lastSeenAt: string | null;
  registeredBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentPermission {
  id: string;
  agentId: string;
  actionType: string;
  allowed: boolean;
  conditions: Record<string, unknown> | null;
  createdAt: string;
}

export interface AgentReputation {
  agentId: string;
  totalValidations: number;
  approvedCount: number;
  rejectedCount: number;
  escalatedCount: number;
  avgComplianceScore: number;
  lastUpdated: number;
}

export interface RegisterAgentInput {
  name: string;
  description?: string;
  agentType: AgentType;
  metadata?: Record<string, unknown>;
}

export interface RegisterAgentResponse {
  agent: Agent;
  apiKey: string; // shown once, never again
}

export interface UpdateAgentInput {
  name?: string;
  description?: string;
  status?: AgentStatus;
  metadata?: Record<string, unknown>;
}
