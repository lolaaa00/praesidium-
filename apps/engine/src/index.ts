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
const pinoMiddleware = pinoHttp.default || pinoHttp;
app.use(pinoMiddleware({ logger, autoLogging: { ignore: (req: IncomingMessage) => req.url === '/health' } }));

// ── Routes ──
app.use(healthRouter);
app.use(validateRouter);

// ── Error Handler ──
app.use(errorHandler);

// ── Start ──
app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Praesidium Validation Engine started');
});

export default app;
