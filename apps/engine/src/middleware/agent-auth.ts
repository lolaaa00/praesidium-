import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import { getSupabase } from '../lib/supabase.js';
import { logger } from '../config/logger.js';

declare global {
  namespace Express {
    interface Request {
      agent?: {
        id: string;
        orgId: string;
        name: string;
        agentType: string;
        status: string;
      };
    }
  }
}

/**
 * Middleware that authenticates agents by API key.
 * Expects: Authorization: Bearer prs_<hex>
 *
 * Hashes the provided key with SHA-256 and looks up the hash in the agents table.
 * The raw key is NEVER stored — only the hash.
 */
export async function agentAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const apiKey = authHeader.slice(7); // Remove "Bearer "

  if (!apiKey.startsWith('prs_')) {
    res.status(401).json({ error: 'Invalid API key format' });
    return;
  }

  // Hash the provided key
  const keyHash = createHash('sha256').update(apiKey).digest('hex');

  try {
    const supabase = getSupabase();

    const { data: agent, error } = await supabase
      .from('agents')
      .select('id, org_id, name, agent_type, status')
      .eq('api_key_hash', keyHash)
      .maybeSingle();

    if (error || !agent) {
      logger.warn({ requestId: req.requestId }, 'Invalid API key');
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    if (agent.status !== 'active') {
      logger.warn({ agentId: agent.id, status: agent.status }, 'Agent not active');
      res.status(403).json({ error: `Agent is ${agent.status}` });
      return;
    }

    // Attach agent to request
    req.agent = {
      id: agent.id,
      orgId: agent.org_id,
      name: agent.name,
      agentType: agent.agent_type,
      status: agent.status,
    };

    // Update last_seen_at (non-blocking)
    void (async () => {
      try {
        await supabase
          .from('agents')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', agent.id);
      } catch { /* non-critical */ }
    })();

    next();
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'Agent auth error');
    res.status(500).json({ error: 'Authentication failed' });
  }
}
