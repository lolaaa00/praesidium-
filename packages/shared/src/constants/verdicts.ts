// ──────────────────────────────────────────
// Validation Verdicts
// ──────────────────────────────────────────

export const VERDICTS = {
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ESCALATE: 'escalate',
} as const;

export const VERDICT_LABELS: Record<string, string> = {
  approved: 'Approved',
  rejected: 'Rejected',
  escalate: 'Escalate',
};

export const VERDICT_COLORS: Record<string, string> = {
  approved: 'green',
  rejected: 'red',
  escalate: 'yellow',
};

export const VALIDATION_STATUSES = {
  PENDING: 'pending',
  SUBMITTING: 'submitting',
  VALIDATING: 'validating',
  FINALIZED: 'finalized',
  FAILED: 'failed',
  TIMEOUT: 'timeout',
} as const;

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  submitting: 'Submitting',
  validating: 'Validating',
  finalized: 'Finalized',
  failed: 'Failed',
  timeout: 'Timed Out',
};
