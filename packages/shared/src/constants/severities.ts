// ──────────────────────────────────────────
// Rule Severity Levels
// ──────────────────────────────────────────

export const SEVERITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export type Severity = (typeof SEVERITIES)[keyof typeof SEVERITIES];

export const SEVERITY_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const SEVERITY_COLORS: Record<string, string> = {
  low: 'slate',
  medium: 'yellow',
  high: 'orange',
  critical: 'red',
};

// Severity weight for risk scoring
export const SEVERITY_WEIGHTS: Record<string, number> = {
  low: 0.1,
  medium: 0.3,
  high: 0.6,
  critical: 1.0,
};
