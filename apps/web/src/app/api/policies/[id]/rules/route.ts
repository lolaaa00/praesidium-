import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, isAuthError } from '@/lib/api/auth-check';

type RouteContext = { params: Promise<{ id: string }> };

// ──────────────────────────────────────────
// GET /api/policies/[id]/rules — List rules for a policy
// ──────────────────────────────────────────

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request.headers);
  if (isAuthError(auth)) return auth;

  const { supabase, orgId } = auth;
  const { id: policyId } = await context.params;

  // Verify policy belongs to org
  const { data: policy } = await supabase
    .from('policies')
    .select('id')
    .eq('id', policyId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (!policy) {
    return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
  }

  const { data: rules, error } = await supabase
    .from('policy_rules')
    .select('*')
    .eq('policy_id', policyId)
    .order('sort_order', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rules });
}

// ──────────────────────────────────────────
// POST /api/policies/[id]/rules — Create a rule
// ──────────────────────────────────────────

const ruleDefinitionSchema = z.object({
  condition: z.string().min(1, 'Condition is required'),
  actionTypes: z.array(z.string()).min(1, 'At least one action type is required'),
  parameters: z.record(z.unknown()).optional(),
});

const createRuleSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().min(1).max(2000),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  ruleDefinition: ruleDefinitionSchema,
  enabled: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request.headers);
  if (isAuthError(auth)) return auth;

  const { user, supabase, orgId, role } = auth;
  const { id: policyId } = await context.params;

  if (!['owner', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  let body: z.infer<typeof createRuleSchema>;
  try {
    body = createRuleSchema.parse(await request.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: err.flatten().fieldErrors },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Verify policy belongs to org and is editable
  const { data: policy } = await supabase
    .from('policies')
    .select('id, status')
    .eq('id', policyId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (!policy) {
    return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
  }

  if (policy.status === 'archived') {
    return NextResponse.json(
      { error: 'Cannot add rules to an archived policy' },
      { status: 400 },
    );
  }

  // Auto-assign sort order if not provided
  if (body.sortOrder === 0) {
    const { count } = await supabase
      .from('policy_rules')
      .select('*', { count: 'exact', head: true })
      .eq('policy_id', policyId);
    body.sortOrder = (count || 0) + 1;
  }

  const { data: rule, error } = await supabase
    .from('policy_rules')
    .insert({
      policy_id: policyId,
      name: body.name,
      description: body.description,
      severity: body.severity,
      rule_definition: body.ruleDefinition,
      enabled: body.enabled,
      sort_order: body.sortOrder,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    org_id: orgId,
    user_id: user.id,
    action: 'rule_created',
    resource_type: 'policy_rule',
    resource_id: rule.id,
    details: { policyId, name: body.name, severity: body.severity },
  });

  return NextResponse.json({ rule }, { status: 201 });
}

// ──────────────────────────────────────────
// PUT /api/policies/[id]/rules — Update a rule (ruleId in body)
// ──────────────────────────────────────────

const updateRuleSchema = z.object({
  ruleId: z.string().uuid(),
  name: z.string().min(2).max(200).optional(),
  description: z.string().max(2000).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  ruleDefinition: ruleDefinitionSchema.optional(),
  enabled: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request.headers);
  if (isAuthError(auth)) return auth;

  const { user, supabase, orgId, role } = auth;
  const { id: policyId } = await context.params;

  if (!['owner', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  let body: z.infer<typeof updateRuleSchema>;
  try {
    body = updateRuleSchema.parse(await request.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: err.flatten().fieldErrors },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Verify policy belongs to org
  const { data: policy } = await supabase
    .from('policies')
    .select('id, status')
    .eq('id', policyId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (!policy) {
    return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
  }

  if (policy.status === 'archived') {
    return NextResponse.json(
      { error: 'Cannot update rules on an archived policy' },
      { status: 400 },
    );
  }

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.severity !== undefined) updates.severity = body.severity;
  if (body.ruleDefinition !== undefined) updates.rule_definition = body.ruleDefinition;
  if (body.enabled !== undefined) updates.enabled = body.enabled;
  if (body.sortOrder !== undefined) updates.sort_order = body.sortOrder;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { data: rule, error } = await supabase
    .from('policy_rules')
    .update(updates)
    .eq('id', body.ruleId)
    .eq('policy_id', policyId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from('audit_logs').insert({
    org_id: orgId,
    user_id: user.id,
    action: 'rule_updated',
    resource_type: 'policy_rule',
    resource_id: body.ruleId,
    details: updates,
  });

  return NextResponse.json({ rule });
}

// ──────────────────────────────────────────
// DELETE /api/policies/[id]/rules — Delete a rule (ruleId in query)
// ──────────────────────────────────────────

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request.headers);
  if (isAuthError(auth)) return auth;

  const { user, supabase, orgId, role } = auth;
  const { id: policyId } = await context.params;

  if (!['owner', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const url = new URL(request.url);
  const ruleId = url.searchParams.get('ruleId');

  if (!ruleId) {
    return NextResponse.json({ error: 'Missing ruleId query parameter' }, { status: 400 });
  }

  // Verify policy belongs to org
  const { data: policy } = await supabase
    .from('policies')
    .select('id')
    .eq('id', policyId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (!policy) {
    return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
  }

  const { error } = await supabase
    .from('policy_rules')
    .delete()
    .eq('id', ruleId)
    .eq('policy_id', policyId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from('audit_logs').insert({
    org_id: orgId,
    user_id: user.id,
    action: 'rule_deleted',
    resource_type: 'policy_rule',
    resource_id: ruleId,
    details: { policyId },
  });

  return NextResponse.json({ success: true });
}
