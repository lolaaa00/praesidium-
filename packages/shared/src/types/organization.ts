// ──────────────────────────────────────────
// Organization Types
// ──────────────────────────────────────────

export type OrgRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  settings: OrgSettings;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrgSettings {
  riskThreshold?: number;
  escalationEnabled?: boolean;
  maxValidationsPerMinute?: number;
  defaultPolicyId?: string;
}

export interface OrgMember {
  id: string;
  orgId: string;
  userId: string;
  role: OrgRole;
  invitedBy: string | null;
  joinedAt: string;
  // Joined from user_profiles
  walletAddress?: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface UserProfile {
  id: string;
  walletAddress: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrgInput {
  name: string;
  description?: string;
}

export interface UpdateOrgInput {
  name?: string;
  description?: string;
  settings?: Partial<OrgSettings>;
}

export interface InviteMemberInput {
  walletAddress: string;
  role?: OrgRole;
}

// ──────────────────────────────────────────
// Audit Types
// ──────────────────────────────────────────

export type AuditAction =
  | 'user_login'
  | 'user_logout'
  | 'org_created'
  | 'org_updated'
  | 'member_invited'
  | 'member_removed'
  | 'member_role_changed'
  | 'policy_created'
  | 'policy_updated'
  | 'policy_activated'
  | 'policy_archived'
  | 'rule_created'
  | 'rule_updated'
  | 'rule_deleted'
  | 'agent_registered'
  | 'agent_updated'
  | 'agent_suspended'
  | 'agent_revoked'
  | 'validation_requested'
  | 'validation_completed'
  | 'validation_failed'
  | 'escalation_created'
  | 'escalation_resolved'
  | 'settings_updated'
  | 'api_key_rotated';

export interface AuditLog {
  id: string;
  orgId: string;
  userId: string | null;
  agentId: string | null;
  action: AuditAction;
  resourceType: string;
  resourceId: string | null;
  details: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
}

// ──────────────────────────────────────────
// Escalation Types
// ──────────────────────────────────────────

export type EscalationStatus = 'open' | 'approved' | 'rejected' | 'policy_updated';

export interface Escalation {
  id: string;
  orgId: string;
  requestId: string;
  resultId: string;
  reason: string;
  status: EscalationStatus;
  resolvedBy: string | null;
  resolutionNote: string | null;
  finalVerdict: string | null;
  createdAt: string;
  resolvedAt: string | null;
}
