import { Router, type IRouter } from 'express';
import { env } from '../config/env.js';

const router: IRouter = Router();

router.get('/health', async (_req, res) => {
  // Probe GenLayer reachability (non-blocking, 3s timeout)
  let genlayerReachable = false;
  try {
    const response = await fetch(env.GENLAYER_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'net_version', params: [], id: 1 }),
      signal: AbortSignal.timeout(3000),
    });
    genlayerReachable = response.ok;
  } catch {
    genlayerReachable = false;
  }

  const overallStatus = genlayerReachable ? 'healthy' : 'degraded';

  res.json({
    status: overallStatus,
    service: 'praesidium-engine',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    network: 'studionet',
    contractAddress: env.GENLAYER_CONTRACT_ADDRESS || null,
    genlayer: {
      reachable: genlayerReachable,
      rpcUrl: env.GENLAYER_RPC_URL,
    },
  });
});

export { router as healthRouter };
