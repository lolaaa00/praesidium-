import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/api/auth-check';
import { readContractPublic } from '@/lib/genlayer/client';

type RouteContext = { params: Promise<{ id: string }> };

// ──────────────────────────────────────────
// GET /api/validations/[id] — Full validation detail
// ──────────────────────────────────────────

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request.headers);
  if (isAuthError(auth)) return auth;

  const { supabase, orgId } = auth;
  const { id } = await context.params;

  const { data: validation, error } = await supabase
    .from('validation_requests')
    .select(
      `*,
       agent:agents(id, name, agent_type, status),
       policy:policies(id, name, status, version),
       validation_results(
         *,
         validation_violations(*)
       ),
       escalations(*)`,
    )
    .eq('id', id)
    .eq('org_id', orgId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!validation) {
    return NextResponse.json({ error: 'Validation not found' }, { status: 404 });
  }

  // Verdict/scores/reasoning authority moves to the deployed contract on
  // reads. The contract's get_validation is keyed by the same UUID used as
  // `validation_requests.id` (the engine submits validate_action with that
  // exact id as request_id — see apps/engine/src/services/validation.ts).
  // These fields live on the nested validation_results row (which is what
  // the frontend actually renders), so we overwrite there rather than on
  // the top-level validation object. Best-effort: keep Supabase values and
  // flag _onChainVerified: false on any on-chain read failure.
  let mergedValidation: Record<string, unknown> = { ...validation };
  const results = (validation.validation_results as Array<Record<string, unknown>> | null) ?? [];
  try {
    const raw = (await readContractPublic('get_validation', [id])) as string;
    const parsed = JSON.parse(raw) as {
      error?: string;
      verdict?: string;
      compliance_score?: number;
      risk_score?: number;
      reasoning?: string;
    };
    if (parsed.error) {
      throw new Error(parsed.error);
    }
    const mergedResults =
      results.length > 0
        ? [
            {
              ...results[0],
              verdict: parsed.verdict,
              compliance_score: parsed.compliance_score,
              risk_score: parsed.risk_score,
              reasoning: parsed.reasoning,
            },
            ...results.slice(1),
          ]
        : results;
    mergedValidation = { ...mergedValidation, validation_results: mergedResults, _onChainVerified: true };
  } catch (err) {
    console.warn(`On-chain get_validation read failed for validation ${id}:`, err);
    mergedValidation = { ...mergedValidation, _onChainVerified: false };
  }

  return NextResponse.json({ validation: mergedValidation });
}
