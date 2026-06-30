# Custom container image for GKE Agent Sandbox.
#
# Runs a Node.js execution server inside a gVisor-isolated sandbox pod.
# The server exposes /exec (bash) and /eval (JavaScript) endpoints.
#
# Security requirements for Agent Sandbox containers:
#   - Must run as non-root (runAsNonRoot: true in pod spec)
#   - All capabilities dropped (capabilities.drop: ["ALL"])
#   - Runs on gVisor runtime (runtimeClassName: gvisor)
#
# Build & push:
#   docker build -t us-docker.pkg.dev/$PROJECT/flue/agent-sandbox:latest .
#   docker push us-docker.pkg.dev/$PROJECT/flue/agent-sandbox:latest

FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json tsconfig.json /app/
RUN npm install 2>/dev/null

COPY src/ /app/src/

# Compile TypeScript
RUN npx tsc

# ── Production stage ──────────────────────────────────────────
FROM node:22-alpine

WORKDIR /app

# Install common tools agents might need via /exec
RUN apk add --no-cache \
    bash \
    curl \
    git \
    jq \
    wget \
    ca-certificates

COPY package.json /app/
RUN npm install --omit=dev 2>/dev/null; true

COPY --from=builder /app/dist/ /app/dist/

# Create workspace directory for agent file operations
RUN mkdir -p /workspace /tmp/sandbox && \
    chmod 777 /workspace /tmp/sandbox

# Run as non-root (UID 1000) — matches pod securityContext
RUN addgroup -g 1000 -S appgroup && \
    adduser -u 1000 -S appuser -G appgroup && \
    chown -R appuser:appgroup /app /workspace /tmp/sandbox
USER appuser

EXPOSE 8080

LABEL maintainer="flue-framework" \
      description="Custom sandbox image for Flue agents on GKE Agent Sandbox" \
      version="1.0.0"

CMD ["node", "dist/server.js"]
