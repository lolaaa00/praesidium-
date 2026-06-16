// ──────────────────────────────────────────
// Standard Action Types
// ──────────────────────────────────────────

export const ACTION_TYPES = {
  TOOL_CALL: 'tool_call',
  API_REQUEST: 'api_request',
  DATA_ACCESS: 'data_access',
  DATA_MODIFICATION: 'data_modification',
  SEND_MESSAGE: 'send_message',
  SEND_EMAIL: 'send_email',
  FILE_OPERATION: 'file_operation',
  FINANCIAL_TRANSACTION: 'financial_transaction',
  SYSTEM_COMMAND: 'system_command',
  EXTERNAL_SERVICE: 'external_service',
  USER_IMPERSONATION: 'user_impersonation',
  CONTENT_GENERATION: 'content_generation',
  DECISION_MAKING: 'decision_making',
  WORKFLOW_TRIGGER: 'workflow_trigger',
  CUSTOM: 'custom',
} as const;

export type ActionType = (typeof ACTION_TYPES)[keyof typeof ACTION_TYPES];

export const ACTION_TYPE_LABELS: Record<string, string> = {
  tool_call: 'Tool Call',
  api_request: 'API Request',
  data_access: 'Data Access',
  data_modification: 'Data Modification',
  send_message: 'Send Message',
  send_email: 'Send Email',
  file_operation: 'File Operation',
  financial_transaction: 'Financial Transaction',
  system_command: 'System Command',
  external_service: 'External Service',
  user_impersonation: 'User Impersonation',
  content_generation: 'Content Generation',
  decision_making: 'Decision Making',
  workflow_trigger: 'Workflow Trigger',
  custom: 'Custom',
};

// Default risk weight by action type (used in risk scoring)
export const ACTION_TYPE_RISK_WEIGHTS: Record<string, number> = {
  tool_call: 0.4,
  api_request: 0.3,
  data_access: 0.3,
  data_modification: 0.6,
  send_message: 0.5,
  send_email: 0.5,
  file_operation: 0.5,
  financial_transaction: 0.9,
  system_command: 0.8,
  external_service: 0.4,
  user_impersonation: 0.9,
  content_generation: 0.3,
  decision_making: 0.7,
  workflow_trigger: 0.6,
  custom: 0.5,
};
