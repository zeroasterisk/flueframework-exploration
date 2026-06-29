# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS build

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install

COPY . .
RUN pnpm build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:22-alpine

RUN apk add --no-cache tini curl

WORKDIR /app

# Copy only the built output and production deps
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

# GEAP Agent Runtime default port (same as Cloud Run convention)
ENV PORT=8080
EXPOSE 8080

# Health check for GEAP liveness probes
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Use tini for proper signal handling (graceful shutdown)
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/server.mjs"]
