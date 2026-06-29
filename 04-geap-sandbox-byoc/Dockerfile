# BYOC (Bring Your Own Container) image for GEAP Managed Agents Sandbox.
#
# This image pre-installs the Flue runtime alongside common CLI tools
# (git, curl, jq, etc.) so agents start with a batteries-included
# environment instead of pip-installing everything at interaction time.
#
# Requirements for GEAP BYOC containers:
#   - Must be pushed to Artifact Registry (or Docker Hub)
#   - The GEAP Agent Platform Service Agent must have
#     roles/artifactregistry.reader on the repository
#   - Should include Python 3.12+ and Node.js 22+ for agent tooling
#   - Should NOT run as root in production (sandbox enforces isolation)
#
# Build & push:
#   docker build -t us-docker.pkg.dev/$PROJECT/flue/sandbox:latest .
#   docker push us-docker.pkg.dev/$PROJECT/flue/sandbox:latest

FROM python:3.12-slim AS base

# ── System packages ────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    jq \
    wget \
    unzip \
    ca-certificates \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# ── Node.js 22 (LTS) ──────────────────────────────────────────
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# ── Python packages commonly needed by agents ─────────────────
RUN pip install --no-cache-dir \
    requests \
    pyyaml \
    httpx \
    pandas \
    numpy

# ── Workspace directory ───────────────────────────────────────
RUN mkdir -p /workspace && chmod 777 /workspace
WORKDIR /workspace

# ── Metadata ──────────────────────────────────────────────────
LABEL maintainer="flue-framework" \
      description="BYOC sandbox image for Flue agents on GEAP" \
      version="1.0.0"

# Keep the container alive — GEAP sandbox manages lifecycle.
CMD ["sleep", "infinity"]
