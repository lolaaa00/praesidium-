import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './config/logger';
import { requestIdMiddleware } from './middleware/request-id';
import { errorHandler } from './middleware/error-handler';
import { healthRouter } from './routes/health';

const app = express();

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
app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' } }));

// ── Routes ──
app.use(healthRouter);

// Validation routes will be added in Step 14
// app.use('/v1', validateRouter);

// ── Error Handler ──
app.use(errorHandler);

// ── Start ──
app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Praesidium Validation Engine started');
});

export default app;
