import { Router, type IRouter, Request, Response } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { agentAuthMiddleware } from '../middleware/agent-auth.js';
import { runValidation } from '../services/validation.js';
import { logger } from '../config/logger.js';

// Rate limit: 60 validation requests per minute per agent (keyed by agent API key prefix)
const validateRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: (req: Request) => req.agent?.id ?? req.ip ?? 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limited', message: 'Too many validation requests. Limit: 60/min.' },
});

const router: IRouter = Router();

// ──────────────────────────────────────────
// POST /v1/validate — Submit a validation request
// ──────────────────────────────────────────

const validateSchema = z.object({
  policyId: z.string().uuid('Invalid policy ID'),
  actionType: z.string().min(1).max(100),
  actionPayload: z.record(z.unknown()),
  context: z.record(z.unknown()).optional(),
});

router.post(
  '/v1/validate',
  agentAuthMiddleware,
  validateRateLimit,
  async (req: Request, res: Response): Promise<void> => {
    const agent = req.agent!;

    // Validate request body
    const parsed = validateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'validation_error',
        message: 'Invalid request data',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { policyId, actionType, actionPayload, context } = parsed.data;

    logger.info(
      {
        requestId: req.requestId,
        agentId: agent.id,
        agentName: agent.name,
        policyId,
        actionType,
      },
      'Validation request received',
    );

    try {
      const result = await runValidation({
        agentId: agent.id,
        orgId: agent.orgId,
        policyId,
        actionType,
        actionPayload,
        context,
      });

      res.status(200).json({
        success: true,
        requestId: result.requestId,
        verdict: result.verdict,
        complianceScore: result.complianceScore,
        reasoning: result.reasoning,
        violations: result.violations,
        consensus: {
          txHash: result.txHash,
          verified: !!result.txHash,
        },
      });
    } catch (error) {
      logger.error(
        {
          requestId: req.requestId,
          agentId: agent.id,
          error: (error as Error).message,
        },
        'Validation failed',
      );

      res.status(500).json({
        error: 'validation_failed',
        message: (error as Error).message,
      });
    }
  },
);

// ──────────────────────────────────────────
// GET /v1/validate/:id — Get validation status
// ──────────────────────────────────────────

router.get(
  '/v1/validate/:id',
  agentAuthMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const agent = req.agent!;
    const { id } = req.params;

    const { getSupabase } = await import('../lib/supabase.js');
    const supabase = getSupabase();

    const { data: validation, error } = await supabase
      .from('validation_requests')
      .select('*, validation_results(*, validation_violations(*))')
      .eq('id', id)
      .eq('org_id', agent.orgId)
      .maybeSingle();

    if (error || !validation) {
      res.status(404).json({ error: 'Validation not found' });
      return;
    }

    res.json({ validation });
  },
);

export { router as validateRouter };
