# Build from monorepo root — pass context as `docker build -f apps/engine/Dockerfile .`
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# ── Dependency layer (leverages Docker cache) ──────────────────────────────────
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/engine/package.json ./apps/engine/
RUN pnpm install --frozen-lockfile

# ── Build ──────────────────────────────────────────────────────────────────────
FROM deps AS builder
# Copy source
COPY packages/shared/ ./packages/shared/
COPY apps/engine/ ./apps/engine/
# Build shared, then engine
RUN pnpm --filter @praesidium/shared build 2>/dev/null || true
RUN pnpm --filter @praesidium/engine build

# ── Production image ───────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Only copy what the engine needs at runtime
COPY --from=builder /app/apps/engine/dist ./dist
COPY --from=builder /app/apps/engine/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "dist/index.js"]
