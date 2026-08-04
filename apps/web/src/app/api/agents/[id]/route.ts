import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomBytes, createHash } from 'crypto';
import { requireAuth, isAuthError } from '@/lib/api/auth-check';
import { readContractPublic } from '@/lib/genlayer/client';

type RouteContext = { params: Promise<{ id: string }> };

// Deliberately excludes genlayer_key_ciphertext — see apps/web/src/app/api/agents/route.ts.
const AGENT_PUBLIC_COLUMNS =
  'id, org_id, name, description, agent_type, status, api_key_hash, api_key_prefix, metadata, last_seen_at, registered_by, created_at, updated_at, genlayer_address' as const;

// ──────────────────────────────────────────
// GET /api/agents/[id] — Get a single agent with permissions
// ──────────────────────────────────────────

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request.headers);
  if (isAuthError(auth)) return auth;

  const { supabase, orgId } = auth;
  const { id } = await context.params;

  const { data: agent, error } = await supabase
    .from('agents')
    .select(`${AGENT_PUBLIC_COLUMNS}, agent_permissions(*)`)
    .eq('id', id)
    .eq('org_id', orgId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  // Status authority moves to the deployed contract on reads — it's keyed
  // by the same UUID as `agents.id` (see register_agent call in
  // agents/new/page.tsx). AGENT_STATUS_* on-chain constants use the exact
  // same strings as the Supabase `agent_status` enum, so this is a direct
  // overwrite. Best-effort: fall back to Supabase on any on-chain failure.
  let mergedAgent: Record<string, unknown> = { ...agent };
  try {
    const raw = (await readContractPublic('get_agent', [id])) as string;
    const parsed = JSON.parse(raw) as { error?: string; status?: string };
    if (parsed.error) {
      throw new Error(parsed.error);
    }
    mergedAgent = { ...mergedAgent, status: parsed.status, _onChainVerified: true };
  } catch (err) {
    console.warn(`On-chain get_agent read failed for agent ${id}:`, err);
    mergedAgent = { ...mergedAgent, _onChainVerified: false };
  }

  return NextResponse.json({ agent: mergedAgent });
}

// ──────────────────────────────────────────
// PUT /api/agents/[id] — Update an agent
// ──────────────────────────────────────────

const updateAgentSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(['active', 'suspended', 'revoked']).optional(),
  metadata: z.record(z.unknown()).optional(),
  rotateKey: z.boolean().optional(),
});

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request.headers);
  if (isAuthError(auth)) return auth;

  const { user, supabase, orgId, role } = auth;
  const { id } = await context.params;

  if (!['owner', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  let body: z.infer<typeof updateAgentSchema>;
  try {
    body = updateAgentSchema.parse(await request.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: err.flatten().fieldErrors },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Build update object
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.metadata !== undefined) updates.metadata = body.metadata;

  let newApiKey: string | undefined;

  // Handle status changes
  if (body.status !== undefined) {
    updates.status = body.status;
  }

  // Handle API key rotation
  if (body.rotateKey) {
    const keyBytes = randomBytes(32);
    newApiKey = `prs_${keyBytes.toString('hex')}`;
    updates.api_key_prefix = newApiKey.slice(0, 12);
    updates.api_key_hash = createHash('sha256').update(newApiKey).digest('hex');
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { data: agent, error } = await supabase
    .from('agents')
    .update(updates)
    .eq('id', id)
    .eq('org_id', orgId)
    .select(AGENT_PUBLIC_COLUMNS)
    .single();

  if (error) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  // Determine audit action
  let action: string = 'agent_updated';
  if (body.status === 'suspended') action = 'agent_suspended';
  if (body.status === 'revoked') action = 'agent_revoked';

  await supabase.from('audit_logs').insert({
    org_id: orgId,
    user_id: user.id,
    action,
    resource_type: 'agent',
    resource_id: id,
    details: {
      ...updates,
      api_key_hash: undefined, // never log the hash
      rotatedKey: !!body.rotateKey,
    },
  });

  const response: Record<string, unknown> = { agent };
  if (newApiKey) {
    response.apiKey = newApiKey; // shown once
  }

  return NextResponse.json(response);
}

// ──────────────────────────────────────────
// DELETE /api/agents/[id] — Revoke an agent (soft delete)
// ──────────────────────────────────────────

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request.headers);
  if (isAuthError(auth)) return auth;

  const { user, supabase, orgId, role } = auth;
  const { id } = await context.params;

  if (!['owner', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { data: agent, error } = await supabase
    .from('agents')
    .update({ status: 'revoked' })
    .eq('id', id)
    .eq('org_id', orgId)
    .select(AGENT_PUBLIC_COLUMNS)
    .single();

  if (error) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  await supabase.from('audit_logs').insert({
    org_id: orgId,
    user_id: user.id,
    action: 'agent_revoked',
    resource_type: 'agent',
    resource_id: id,
    details: { name: agent.name },
  });

  return NextResponse.json({ success: true });
}
