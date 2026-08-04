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
COPY tsconfig.base.json ./
COPY packages/shared/ ./packages/shared/
COPY apps/engine/ ./apps/engine/
# Build shared, then engine
RUN pnpm --filter @praesidium/shared build
RUN pnpm --filter @praesidium/engine build

# ── Production image ───────────────────────────────────────────────────────────
# pnpm's symlinked node_modules layout is relative-path and depth-sensitive, so
# the monorepo directory structure is preserved as-is rather than flattened.
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=builder /app/apps/engine/dist ./apps/engine/dist
COPY --from=builder /app/apps/engine/package.json ./apps/engine/package.json
COPY --from=builder /app/apps/engine/node_modules ./apps/engine/node_modules

WORKDIR /app/apps/engine

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "dist/index.js"]
