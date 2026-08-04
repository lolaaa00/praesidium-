import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, isAuthError } from '@/lib/api/auth-check';
import { createAdminClient } from '@/lib/supabase/admin';
import { readContractPublic } from '@/lib/genlayer/client';

type RouteContext = { params: Promise<{ id: string }> };

// ──────────────────────────────────────────
// GET /api/policies/[id] — Get a single policy with rules
// ──────────────────────────────────────────

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request.headers);
  if (isAuthError(auth)) return auth;

  const { supabase, orgId } = auth;
  const { id } = await context.params;

  const { data: policy, error } = await supabase
    .from('policies')
    .select('*, policy_rules(*)')
    .eq('id', id)
    .eq('org_id', orgId)
    .order('sort_order', { referencedTable: 'policy_rules', ascending: true })
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!policy) {
    return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
  }

  // On production reads, version/rules_hash/active come from the deployed
  // contract (the Intelligent Contract is the source of truth for these
  // fields) — Supabase stays authoritative for rule text. The contract is
  // keyed by the same UUID as `policies.id` (see register_policy call in
  // policies/new/page.tsx). Best-effort: fall back to the Supabase value
  // and flag _onChainVerified: false rather than failing the page.
  let mergedPolicy: Record<string, unknown> = { ...policy };
  try {
    const raw = (await readContractPublic('get_policy', [id])) as string;
    const parsed = JSON.parse(raw) as {
      error?: string;
      version?: number;
      rules_hash?: string;
      active?: boolean;
    };
    if (parsed.error) {
      throw new Error(parsed.error);
    }
    mergedPolicy = {
      ...mergedPolicy,
      version: parsed.version,
      rules_hash: parsed.rules_hash,
      active: parsed.active,
      _onChainVerified: true,
    };
  } catch (err) {
    console.warn(`On-chain get_policy read failed for policy ${id}:`, err);
    mergedPolicy = { ...mergedPolicy, _onChainVerified: false };
  }

  return NextResponse.json({ policy: mergedPolicy });
}

// ──────────────────────────────────────────
// PUT /api/policies/[id] — Update a policy
// ──────────────────────────────────────────

const updatePolicySchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
});

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request.headers);
  if (isAuthError(auth)) return auth;

  const { user, supabase, orgId, role } = auth;
  const { id } = await context.params;

  if (!['owner', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  let body: z.infer<typeof updatePolicySchema>;
  try {
    body = updatePolicySchema.parse(await request.json());
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
  const { data: existing } = await supabase
    .from('policies')
    .select('id, status, version')
    .eq('id', id)
    .eq('org_id', orgId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;

  // Handle status transitions with versioning
  if (body.status !== undefined && body.status !== existing.status) {
    updates.status = body.status;

    // When activating, bump version and snapshot rules
    if (body.status === 'active' && existing.status === 'draft') {
      const newVersion = existing.version + 1;
      updates.version = newVersion;

      // Snapshot current rules into policy_versions
      const { data: rules } = await supabase
        .from('policy_rules')
        .select('*')
        .eq('policy_id', id)
        .order('sort_order', { ascending: true });

      const admin = createAdminClient();
      await admin.from('policy_versions').insert({
        policy_id: id,
        version: newVersion,
        rules_snapshot: rules || [],
        published_by: user.id,
      });

      // Audit: policy activated
      await supabase.from('audit_logs').insert({
        org_id: orgId,
        user_id: user.id,
        action: 'policy_activated',
        resource_type: 'policy',
        resource_id: id,
        details: { version: newVersion },
      });
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { data: policy, error } = await supabase
    .from('policies')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit: policy updated
  await supabase.from('audit_logs').insert({
    org_id: orgId,
    user_id: user.id,
    action: 'policy_updated',
    resource_type: 'policy',
    resource_id: id,
    details: updates,
  });

  return NextResponse.json({ policy });
}

// ──────────────────────────────────────────
// DELETE /api/policies/[id] — Archive a policy (soft delete)
// ──────────────────────────────────────────

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request.headers);
  if (isAuthError(auth)) return auth;

  const { user, supabase, orgId, role } = auth;
  const { id } = await context.params;

  if (!['owner', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  // Soft delete — set status to archived
  const { data: policy, error } = await supabase
    .from('policies')
    .update({ status: 'archived' })
    .eq('id', id)
    .eq('org_id', orgId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
  }

  await supabase.from('audit_logs').insert({
    org_id: orgId,
    user_id: user.id,
    action: 'policy_archived',
    resource_type: 'policy',
    resource_id: id,
    details: { name: policy.name },
  });

  return NextResponse.json({ success: true });
}
