import 'dotenv/config';
import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import type { IncomingMessage } from 'http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { requestIdMiddleware } from './middleware/request-id.js';
import { errorHandler } from './middleware/error-handler.js';
import { healthRouter } from './routes/health.js';
import { validateRouter } from './routes/validate.js';

const app: Express = express();

// ── Global Middleware ──
app.use(helmet());
app.use(cors({
  origin: env.NODE_ENV === 'production'
    ? ['https://praesidium.app', 'https://www.praesidium.app']
    : ['http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(requestIdMiddleware);
app.use(pinoHttp({ logger, autoLogging: { ignore: (req: IncomingMessage) => req.url === '/health' } }));

// ── Routes ──
app.use(healthRouter);
app.use(validateRouter);

// ── Error Handler ──
app.use(errorHandler);

// ── Start ──
// Loopback-only in local dev (restricted environments); 0.0.0.0 in production
// so Fly's proxy, which connects from outside the container, can reach it.
const host = env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
app.listen(env.PORT, host, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Praesidium Validation Engine started');
});

export default app;
