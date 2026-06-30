# Exploration 6: Flue Agent on GKE

A Flue agent deployed to Google Kubernetes Engine (GKE) with Workload Identity for Vertex AI access.

## What This Does

Deploys the same **Explorer** agent (calculator tool, Gemini 3.1 Flash Lite) from previous explorations, but targets a GKE cluster instead of Cloud Run or GEAP Agent Runtime. The agent:

- Runs as a Kubernetes Deployment with health/readiness probes
- Is exposed via a LoadBalancer Service
- Uses **Workload Identity** to authenticate to Vertex AI (no key files in containers)
- Gets environment config from a ConfigMap
- Has resource limits (256Mi memory, 0.5 CPU)

## How GKE Differs from Cloud Run and GEAP

| Aspect | Cloud Run (01) | GEAP Agent Runtime (02) | GKE (06) |
|--------|---------------|------------------------|----------|
| **Scaling** | Autoscale to zero | GEAP managed | HPA, VPA, or manual replicas |
| **Networking** | Managed URL | GEAP-governed | Full control (VPC, Ingress, NetworkPolicy) |
| **GPU support** | Limited | None | Native GPU node pools |
| **Multi-service** | Separate services | Separate agents | Co-located pods, service mesh |
| **Cost model** | Pay per request | Pay per agent-hour | Pay per node (always-on) |
| **Identity** | Service account | SPIFFE + SA | Workload Identity |
| **Customization** | Limited | Constrained | Full k8s control |
| **Ops overhead** | Minimal | Low | Moderate (cluster management) |

### When to Choose GKE

- **Custom networking**: VPC-native pods, NetworkPolicies, private clusters, service mesh
- **GPU workloads**: Agents that need GPU for local model inference
- **Multi-service architectures**: Multiple agents co-located with shared services (databases, caches, queues)
- **Compliance**: Strict control over node placement, encryption, network boundaries
- **Cost optimization at scale**: Sustained-use discounts, committed-use contracts, spot VMs for batch agents
- **Existing GKE investment**: Team already runs workloads on GKE

### When NOT to Choose GKE

- **Simple single-agent**: Cloud Run is simpler and cheaper for one-off agents
- **Managed agent lifecycle**: GEAP handles scaling, identity, and governance automatically
- **No k8s expertise**: The operational overhead isn't worth it for small deployments

## Project Structure

```
06-gke/
├── server.js              # HTTP server (same agent logic as 02)
├── Dockerfile             # Container image (node:22-alpine, non-root)
├── package.json           # Minimal, no type:module
├── .dockerignore
├── deploy.sh              # Build, push, apply k8s, wait, print URL
├── k8s/
│   ├── configmap.yaml     # Environment variables (project, model)
│   ├── serviceaccount.yaml # KSA with Workload Identity annotation
│   ├── deployment.yaml    # 1 replica, resource limits, probes
│   └── service.yaml       # LoadBalancer on port 80 → 8080
└── README.md
```

## Prerequisites

1. **GKE cluster** with Workload Identity enabled:
   ```bash
   gcloud container clusters create flue-cluster \
     --region us-central1 \
     --workload-pool=${PROJECT_ID}.svc.id.goog \
     --num-nodes=1
   ```

2. **Artifact Registry** repository:
   ```bash
   gcloud artifacts repositories create flue-agents \
     --repository-format=docker \
     --location=us-central1
   ```

3. **GCP service account** with Vertex AI access:
   ```bash
   gcloud iam service-accounts create flue-agent-sa \
     --display-name="Flue Agent SA"

   gcloud projects add-iam-policy-binding ${PROJECT_ID} \
     --member="serviceAccount:flue-agent-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
     --role="roles/aiplatform.user"
   ```

4. **kubectl** configured for the cluster:
   ```bash
   gcloud container clusters get-credentials flue-cluster --region us-central1
   ```

5. **Docker** installed for building images

## Deploy

```bash
export GCP_PROJECT_ID=my-project
./deploy.sh
```

The script will:
1. Build the container image
2. Push to Artifact Registry
3. Patch and apply k8s manifests (ConfigMap, ServiceAccount, Deployment, Service)
4. Bind Workload Identity (KSA → GCP SA)
5. Wait for rollout to complete
6. Print the external IP / service URL

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GCP_PROJECT_ID` | Yes | — | Google Cloud project ID |
| `GCP_REGION` | No | `us-central1` | Region for Artifact Registry |
| `ARTIFACT_REPO` | No | `flue-agents` | Artifact Registry repo name |
| `AGENT_SA_NAME` | No | `flue-agent-sa` | GCP service account name |
| `K8S_NAMESPACE` | No | `default` | Kubernetes namespace |

## Test

```bash
# Health check
curl http://<EXTERNAL_IP>/

# Query the agent
curl -X POST http://<EXTERNAL_IP>/ \
  -H 'Content-Type: application/json' \
  -d '{"prompt": "What is 144 * 12?"}'

# Check pod status
kubectl get pods -l app=flue-explorer

# View logs
kubectl logs -l app=flue-explorer -f
```

## Scaling

### Manual scaling
```bash
kubectl scale deployment flue-explorer --replicas=3
```

### Horizontal Pod Autoscaler
```bash
kubectl autoscale deployment flue-explorer \
  --min=1 --max=10 --cpu-percent=70
```

### GPU node pools (for local model inference)
```bash
gcloud container node-pools create gpu-pool \
  --cluster=flue-cluster \
  --accelerator=type=nvidia-l4,count=1 \
  --machine-type=g2-standard-4 \
  --num-nodes=1
```

Then add GPU requests to the deployment:
```yaml
resources:
  limits:
    nvidia.com/gpu: 1
```

## Cleanup

```bash
kubectl delete -f k8s/
# or delete the whole cluster:
gcloud container clusters delete flue-cluster --region us-central1
```
