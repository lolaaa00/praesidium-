import { Router, type IRouter } from 'express';

const router: IRouter = Router();

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'praesidium-engine',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export { router as healthRouter };
