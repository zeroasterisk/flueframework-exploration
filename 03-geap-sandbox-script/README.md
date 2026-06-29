# Exploration 3: GEAP Code Execution Sandbox

Use GEAP's Code Execution Sandbox as a sandboxed Python execution environment for Flue agents.

## What is the Code Execution Sandbox?

GEAP offers two sandbox types:

| | Code Execution Sandbox (this exploration) | Managed Agents Sandbox (exploration 4) |
|---|---|---|
| **Access** | Script-only (Python / JavaScript) | Full shell access via BYOC container |
| **Setup** | No container image needed | Requires building and pushing a Docker image |
| **Capabilities** | Run code, read/write sandbox files | Full bash, install packages, run servers |
| **Use case** | Data analysis, calculations, code generation | Complex tooling, system administration, dev environments |
| **Container** | GEAP-managed | Bring Your Own Container |

The Code Execution Sandbox is the simpler option — you send Python code and get back stdout/stderr. No shell access, no custom container, no Dockerfile.

## Capabilities and Limitations

**What you can do:**
- Execute Python or JavaScript code
- Read/write files within the sandbox filesystem
- Use pre-installed Python packages
- State persists across executions within the same sandbox
- Multiple concurrent sandboxes

**Limitations:**
- No shell/bash access
- Python and JavaScript only (no other runtimes)
- Cannot install additional packages at runtime
- 14-day sandbox TTL (auto-destroyed after)
- Limited to packages pre-installed in the GEAP environment

## How Flue Would Use This

A Flue agent could use this sandbox as a tool — e.g., a "code interpreter" tool that executes Python in an isolated environment. The agent stays local (or on Cloud Run), but offloads code execution to GEAP:

```
┌─────────────┐     ┌──────────────────────┐
│  Flue Agent  │────▶│  GEAP Code Execution │
│  (local/CR)  │◀────│  Sandbox             │
└─────────────┘     └──────────────────────┘
     │
     │  Agent sends Python code,
     │  gets stdout/stderr back
```

## Project Structure

```
src/
  geap-sandbox.ts   — Client class wrapping the GEAP sandbox REST API
  demo.ts           — Demo script showing sandbox usage
```

## Environment Setup

```bash
# Required
export GOOGLE_CLOUD_PROJECT=alanblount-demo
export GOOGLE_ACCESS_TOKEN=$(gcloud auth print-access-token)
```

The access token must have permissions for the Vertex AI API (`aiplatform.googleapis.com`).

## Running the Demo

```bash
pnpm install
pnpm demo
```

The demo will:
1. Create a reasoning engine + sandbox environment
2. Run several Python snippets (arithmetic, file I/O, package listing, data processing)
3. Test state persistence across executions
4. Clean up all resources

## API Details

### Create Sandbox

```
POST /v1beta1/projects/{project}/locations/{region}/reasoningEngines
POST /v1beta1/{reasoningEngineName}/sandboxEnvironments
```

Sandbox creation requires a parent reasoning engine. The client creates one automatically if not provided.

### Execute Code

```
POST /v1beta1/{sandboxName}:execute

Body: {
  inputs: [{
    data: base64(JSON.stringify({ code: "print('hello')" })),
    mimeType: "application/json"
  }]
}

Response: {
  outputs: [{
    data: base64(JSON.stringify({
      exit_status_int: 0,
      msg_out: "hello\n",
      msg_err: ""
    })),
    mimeType: "application/json"
  }]
}
```

Input and output payloads are base64-encoded JSON.

### Cleanup

```
DELETE /v1beta1/{sandboxName}
DELETE /v1beta1/{reasoningEngineName}
```
