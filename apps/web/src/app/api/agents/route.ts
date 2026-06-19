import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomBytes, createHash } from 'crypto';
import { requireAuth, isAuthError } from '@/lib/api/auth-check';

// ──────────────────────────────────────────
// GET /api/agents — List agents for the current org
// ──────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request.headers);
  if (isAuthError(auth)) return auth;

  const { supabase, orgId } = auth;

  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const agentType = url.searchParams.get('type');
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
  const offset = (page - 1) * limit;

  let query = supabase
    .from('agents')
    .select('*', { count: 'exact' })
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && ['active', 'suspended', 'revoked'].includes(status)) {
    query = query.eq('status', status);
  }
  if (agentType && ['chatbot', 'workflow', 'autonomous', 'tool_agent'].includes(agentType)) {
    query = query.eq('agent_type', agentType);
  }

  const { data: agents, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    agents,
    pagination: { page, limit, total: count || 0 },
  });
}

// ──────────────────────────────────────────
// POST /api/agents — Register a new agent
// ──────────────────────────────────────────

const registerAgentSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  agentType: z.enum(['chatbot', 'workflow', 'autonomous', 'tool_agent']),
  metadata: z.record(z.unknown()).default({}),
});

/**
 * Generates a prefixed API key and its SHA-256 hash.
 * The raw key is returned to the user exactly ONCE.
 * Only the hash is stored in the database.
 */
function generateApiKey(): { rawKey: string; prefix: string; hash: string } {
  const keyBytes = randomBytes(32);
  const rawKey = `prs_${keyBytes.toString('hex')}`;
  const prefix = rawKey.slice(0, 12); // "prs_XXXXXXXX" — visible in UI
  const hash = createHash('sha256').update(rawKey).digest('hex');
  return { rawKey, prefix, hash };
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request.headers);
  if (isAuthError(auth)) return auth;

  const { user, supabase, orgId, role } = auth;

  if (!['owner', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  let body: z.infer<typeof registerAgentSchema>;
  try {
    body = registerAgentSchema.parse(await request.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: err.flatten().fieldErrors },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { rawKey, prefix, hash } = generateApiKey();

  const { data: agent, error } = await supabase
    .from('agents')
    .insert({
      org_id: orgId,
      name: body.name,
      description: body.description || null,
      agent_type: body.agentType,
      status: 'active',
      api_key_hash: hash,
      api_key_prefix: prefix,
      metadata: body.metadata,
      registered_by: user.id,
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
    action: 'agent_registered',
    resource_type: 'agent',
    resource_id: agent.id,
    details: { name: body.name, agentType: body.agentType },
  });

  return NextResponse.json(
    {
      agent,
      apiKey: rawKey, // Shown ONCE — user must save it
    },
    { status: 201 },
  );
}
