import { getSupabase } from '../lib/supabase.js';
import { callContract } from '../lib/genlayer.js';
import { logger } from '../config/logger.js';

export interface ValidateInput {
  agentId: string;
  orgId: string;
  policyId: string;
  actionType: string;
  actionPayload: Record<string, unknown>;
  context?: Record<string, unknown>;
}

export interface ValidationOutput {
  requestId: string;
  verdict: string;
  complianceScore: number;
  reasoning: string;
  violations: Array<{
    ruleName: string;
    severity: string;
    description: string;
  }>;
  txHash: string | null;
  consensusData: unknown;
}

/**
 * Full validation pipeline:
 * 1. Create validation_request in Supabase (status: pending)
 * 2. Load policy + rules
 * 3. Submit to GenLayer Intelligent Contract for consensus
 * 4. Parse result, write validation_result + violations
 * 5. Update validation_request status
 */
export async function runValidation(input: ValidateInput): Promise<ValidationOutput> {
  const supabase = getSupabase();
  const { agentId, orgId, policyId, actionType, actionPayload, context } = input;

  // 1. Create validation request
  const { data: request, error: reqError } = await supabase
    .from('validation_requests')
    .insert({
      org_id: orgId,
      agent_id: agentId,
      policy_id: policyId,
      action_type: actionType,
      action_payload: actionPayload,
      context: context || {},
      status: 'pending',
    })
    .select()
    .single();

  if (reqError || !request) {
    throw new Error(`Failed to create validation request: ${reqError?.message}`);
  }

  const requestId = request.id;
  logger.info({ requestId, agentId, policyId, actionType }, 'Validation request created');

  try {
    // 2. Load policy + rules
    const { data: policy } = await supabase
      .from('policies')
      .select('*, policy_rules(*)')
      .eq('id', policyId)
      .eq('org_id', orgId)
      .eq('status', 'active')
      .maybeSingle();

    if (!policy) {
      await updateRequestStatus(requestId, 'failed');
      throw new Error('Policy not found or not active');
    }

    const rules = policy.policy_rules || [];
    if (rules.length === 0) {
      await updateRequestStatus(requestId, 'failed');
      throw new Error('Policy has no rules');
    }

    // Mark as processing
    await updateRequestStatus(requestId, 'processing');

    // 3. Build prompt for GenLayer contract
    const rulesText = rules
      .filter((r: { enabled: boolean }) => r.enabled)
      .map(
        (r: { name: string; description: string; severity: string; rule_definition: { condition: string } }, i: number) =>
          `Rule ${i + 1} [${r.severity.toUpperCase()}]: ${r.name}\nCondition: ${r.rule_definition.condition}\nDescription: ${r.description}`,
      )
      .join('\n\n');

    const validationPrompt = JSON.stringify({
      policy: policy.name,
      rules: rulesText,
      actionType,
      actionPayload,
      context: context || {},
    });

    // 4. Submit to GenLayer
    let txHash: string | null = null;
    let consensusResult: unknown = null;

    try {
      const genlayerResult = await callContract('validate_action', [
        requestId,
        agentId,
        validationPrompt,
      ]);

      txHash = genlayerResult.txHash;
      consensusResult = genlayerResult.result;

      logger.info({ requestId, txHash }, 'GenLayer consensus completed');
    } catch (glError) {
      // GenLayer might be unavailable — fall back to local evaluation
      logger.warn(
        { requestId, error: (glError as Error).message },
        'GenLayer unavailable, falling back to local evaluation',
      );

      // Simple local evaluation as fallback
      consensusResult = localEvaluation(rules, actionType, actionPayload);
    }

    // 5. Parse result and write to Supabase
    const parsed = parseConsensusResult(consensusResult);

    // Write validation result
    const { data: result, error: resultError } = await supabase
      .from('validation_results')
      .insert({
        request_id: requestId,
        verdict: parsed.verdict,
        compliance_score: parsed.complianceScore,
        reasoning: parsed.reasoning,
        consensus_data: {
          txHash,
          raw: consensusResult,
          source: txHash ? 'genlayer' : 'local',
        },
      })
      .select()
      .single();

    if (resultError) {
      throw new Error(`Failed to write result: ${resultError.message}`);
    }

    // Write violations
    if (parsed.violations.length > 0) {
      const violationRows = parsed.violations.map((v) => ({
        result_id: result.id,
        rule_name: v.ruleName,
        severity: v.severity,
        description: v.description,
      }));

      await supabase.from('validation_violations').insert(violationRows);
    }

    // Update request status
    await updateRequestStatus(requestId, 'completed');

    // Create escalation if verdict is escalated
    if (parsed.verdict === 'escalated') {
      await supabase.from('escalations').insert({
        org_id: orgId,
        request_id: requestId,
        result_id: result.id,
        reason: parsed.reasoning,
        status: 'open',
      });
    }

    // Write audit log
    await supabase.from('audit_logs').insert({
      org_id: orgId,
      agent_id: agentId,
      action: 'validation_completed',
      resource_type: 'validation_request',
      resource_id: requestId,
      details: {
        verdict: parsed.verdict,
        complianceScore: parsed.complianceScore,
        violationCount: parsed.violations.length,
        txHash,
      },
    });

    return {
      requestId,
      verdict: parsed.verdict,
      complianceScore: parsed.complianceScore,
      reasoning: parsed.reasoning,
      violations: parsed.violations,
      txHash,
      consensusData: consensusResult,
    };
  } catch (error) {
    // Ensure request is marked as failed
    await updateRequestStatus(requestId, 'failed').catch(() => {});

    await supabase.from('audit_logs').insert({
      org_id: orgId,
      agent_id: agentId,
      action: 'validation_failed',
      resource_type: 'validation_request',
      resource_id: requestId,
      details: { error: (error as Error).message },
    });

    throw error;
  }
}

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────

async function updateRequestStatus(requestId: string, status: string): Promise<void> {
  const supabase = getSupabase();
  await supabase.from('validation_requests').update({ status }).eq('id', requestId);
}

interface ParsedResult {
  verdict: string;
  complianceScore: number;
  reasoning: string;
  violations: Array<{ ruleName: string; severity: string; description: string }>;
}

function parseConsensusResult(raw: unknown): ParsedResult {
  // Default result
  const defaultResult: ParsedResult = {
    verdict: 'approved',
    complianceScore: 100,
    reasoning: 'No issues detected',
    violations: [],
  };

  if (!raw || typeof raw !== 'object') return defaultResult;

  try {
    const data = raw as Record<string, unknown>;

    // The GenLayer contract should return a structured result
    const verdict = typeof data.verdict === 'string' ? data.verdict : 'approved';
    const score = typeof data.compliance_score === 'number' ? data.compliance_score : 100;
    const reasoning = typeof data.reasoning === 'string' ? data.reasoning : 'No issues detected';

    const violations: ParsedResult['violations'] = [];
    if (Array.isArray(data.violations)) {
      for (const v of data.violations) {
        if (v && typeof v === 'object') {
          const viol = v as Record<string, unknown>;
          violations.push({
            ruleName: String(viol.rule_name || viol.ruleName || 'Unknown'),
            severity: String(viol.severity || 'medium'),
            description: String(viol.description || 'Violation detected'),
          });
        }
      }
    }

    return { verdict, complianceScore: score, reasoning, violations };
  } catch {
    return defaultResult;
  }
}

/**
 * Simple local evaluation as fallback when GenLayer is unavailable.
 * Checks action types against enabled rules.
 */
function localEvaluation(
  rules: Array<{
    name: string;
    severity: string;
    enabled: boolean;
    rule_definition: { condition: string; actionTypes: string[] };
  }>,
  actionType: string,
  _actionPayload: Record<string, unknown>,
): Record<string, unknown> {
  const violations: Array<{ rule_name: string; severity: string; description: string }> = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;
    const ruleActionTypes = rule.rule_definition.actionTypes || [];

    // Check if this rule applies to the action type
    if (ruleActionTypes.length > 0 && !ruleActionTypes.includes(actionType) && !ruleActionTypes.includes('*')) {
      continue;
    }

    // In local mode, flag rules but don't reject — only GenLayer consensus can reject
    violations.push({
      rule_name: rule.name,
      severity: rule.severity,
      description: `Rule "${rule.name}" applies to this action type. GenLayer consensus unavailable for full evaluation.`,
    });
  }

  const hasCritical = violations.some((v) => v.severity === 'critical');
  const hasHigh = violations.some((v) => v.severity === 'high');

  return {
    verdict: hasCritical ? 'escalated' : hasHigh ? 'conditional' : 'approved',
    compliance_score: hasCritical ? 30 : hasHigh ? 60 : 85,
    reasoning: violations.length > 0
      ? `Local evaluation: ${violations.length} applicable rule(s) found. GenLayer unavailable for consensus — ${hasCritical ? 'escalating' : 'conditionally approved'}.`
      : 'No applicable rules for this action type.',
    violations,
    source: 'local_fallback',
  };
}
