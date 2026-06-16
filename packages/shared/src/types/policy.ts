// ──────────────────────────────────────────
// Policy Types
// ──────────────────────────────────────────

export type PolicyStatus = 'draft' | 'active' | 'archived';

export interface Policy {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  status: PolicyStatus;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyRule {
  id: string;
  policyId: string;
  name: string;
  description: string;
  severity: RuleSeverity;
  ruleDefinition: RuleDefinition;
  enabled: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface RuleDefinition {
  condition: string;
  actionTypes: string[];
  parameters?: Record<string, unknown>;
}

export type RuleSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface PolicyVersion {
  id: string;
  policyId: string;
  version: number;
  rulesSnapshot: PolicyRule[];
  publishedBy: string;
  publishedAt: string;
}

export interface CreatePolicyInput {
  name: string;
  description?: string;
}

export interface UpdatePolicyInput {
  name?: string;
  description?: string;
  status?: PolicyStatus;
}

export interface CreateRuleInput {
  name: string;
  description: string;
  severity: RuleSeverity;
  ruleDefinition: RuleDefinition;
  enabled?: boolean;
  sortOrder?: number;
}

export interface UpdateRuleInput {
  name?: string;
  description?: string;
  severity?: RuleSeverity;
  ruleDefinition?: RuleDefinition;
  enabled?: boolean;
  sortOrder?: number;
}
