# Upstream PR Plan

## PR 1: withastro/flue — A2A Channel Package

**Target:** `packages/a2a/` in the Flue monorepo
**Source:** `zeroasterisk/flue` (packages/a2a/ — 909 lines, QA'd, spec-compliant)
**Status:** Code ready, 2 QA rounds passed

**PR Description:**
Add A2A (Agent-to-Agent) protocol support as a Flue channel. Enables Flue agents to be discovered via Agent Cards and communicate via the A2A standard.

Features:
- Agent Card generation from agent definition
- POST /message:send handler with JSON-RPC 2.0
- GET /tasks/:id for task status
- Spec-compliant routes (/message:send, /tasks/:id:cancel)
- google.rpc.Status error format
- Optional auth callback

**Blockers:** TypeScript A2A SDK not on npm yet. Channel implements the protocol directly.

## PR 2: withastro/flue — AgentMsg Channel Package

**Target:** `packages/agentmsg/` in the Flue monorepo
**Source:** `zeroasterisk/flue` (packages/agentmsg/ — 846 lines, QA'd)

**PR Description:**
Store-and-forward messaging channel for Flue agents via the AgentMsg relay (agentmsg.net). Enables agents behind NAT to communicate without public endpoints.

## PR 3: withastro/flue — GEAP Sandbox Adapter

**Target:** `blueprints/geap-sandbox/` in the Flue monorepo
**Source:** `zeroasterisk/flue` (blueprints/geap-sandbox/ — 644 lines, rewritten to match verified API)

**PR Description:**
GEAP Code Execution Sandbox adapter for Flue's SandboxApi. Wraps Google Cloud's sandbox REST API with verified Chunk-based encoding.

## PR 4: google/adk-docs — BYOC Deployment Guide

**Target:** New page in adk-docs
**Content:** The reverse-engineered GEAP BYOC contract from our exploration

Key documentation gaps we discovered:
- containerSpec silently fails — must use sourceCodeSpec + imageSpec
- Container must start within ~10s
- Response format: `{output: ...}`
- Reserved env vars (GOOGLE_CLOUD_PROJECT, PORT)
- Operation reports failure before build completes (~2 min build time)

## PR 5: agentready-org/standard — Reference Implementation

**Target:** examples/ or implementations/ in agentready-org/standard
**Source:** /workspace/agentmsg/agents/agentready/ (1,340 lines Python)

**PR Description:**
Reference implementation of an AgentReady compliance checker agent. Survey-based, multi-turn dialog, mock backend functions for certification/reputation checks.

## Timeline

1. PR 1 (A2A Channel) — ready to submit now
2. PR 3 (GEAP Sandbox) — ready to submit now
3. PR 4 (BYOC Guide) — can draft quickly
4. PR 2 (AgentMsg) — ready but depends on AgentMsg being public
5. PR 5 (AgentReady) — ready to submit
