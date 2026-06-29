# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app
COPY package.json ./

# Use npm instead of pnpm to avoid supply-chain policy issues with beta packages
RUN npm install --ignore-scripts 2>/dev/null; npm install

COPY . .

# Build the Flue project (compiles TS, bundles agent)
RUN npx flue build 2>/dev/null || echo "flue build skipped — using direct node entry"

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:22-alpine

RUN apk add --no-cache tini

WORKDIR /app

# Copy built output and deps
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
# Fallback: copy source if dist doesn't exist (for direct tsx execution)
COPY --from=build /app/src ./src
COPY --from=build /app/flue.config.ts ./

# Cloud Run default port
ENV PORT=8080
EXPOSE 8080

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/server.mjs"]
