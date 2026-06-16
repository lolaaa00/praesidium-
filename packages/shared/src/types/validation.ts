// ──────────────────────────────────────────
// Validation Types
// ──────────────────────────────────────────

export type ValidationVerdict = 'approved' | 'rejected' | 'escalate';

export type ValidationStatus =
  | 'pending'
  | 'submitting'
  | 'validating'
  | 'finalized'
  | 'failed'
  | 'timeout';

export interface ValidationRequest {
  id: string;
  orgId: string;
  agentId: string;
  policyId: string;
  policyVersion: number;
  actionType: string;
  actionPayload: Record<string, unknown>;
  status: ValidationStatus;
  genlayerTxHash: string | null;
  submittedAt: string;
  completedAt: string | null;
  timeoutAt: string;
}

export interface ValidationResult {
  id: string;
  requestId: string;
  verdict: ValidationVerdict;
  complianceScore: number;
  riskScore: number;
  reasoning: string;
  consensusData: ConsensusData;
  onChainRecordId: string | null;
  createdAt: string;
}

export interface ConsensusData {
  txHash?: string;
  onChainTimestamp?: number;
  validatorCount?: number;
  agreementRatio?: number;
  consensusRounds?: number;
  finalityTimeMs?: number;
}

export interface ValidationViolation {
  id: string;
  resultId: string;
  ruleId: string | null;
  ruleName: string;
  severity: RuleSeverity;
  description: string;
  createdAt: string;
}

// RuleSeverity is defined in policy.ts
import type { RuleSeverity } from './policy';
export type { RuleSeverity } from './policy';

// API request/response types for the validation engine
export interface SubmitValidationRequest {
  actionType: string;
  actionPayload: Record<string, unknown>;
  policyId: string;
}

export interface SubmitValidationResponse {
  requestId: string;
  status: ValidationStatus;
}

export interface ValidationStatusResponse {
  requestId: string;
  status: ValidationStatus;
  result: ValidationResult | null;
}
