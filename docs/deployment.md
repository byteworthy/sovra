# Sovra Deployment Guide

Sovra can be deployed to any of three cloud platforms or self-hosted with Docker Compose. All platforms use the same Docker images built from `packages/web/Dockerfile` and `packages/worker/Dockerfile`.

## Prerequisites

- Docker 24+
- Git
- A Supabase project (cloud or self-hosted)
- API keys for the AI providers you want to use (OpenAI and/or Anthropic)

## Platform Options

| Platform | Best for | Complexity |
|---|---|---|
| Docker Compose | Self-hosted, on-premises | Low |
| Railway | Quick cloud deploy, small teams | Low |
| GCP Cloud Run | GCP users, serverless scaling | Medium |
| AWS ECS Fargate | Production, enterprise, AWS users | High |

---

## Option 1: Docker Compose (Self-Hosted)

The simplest path. Runs both services on a single host.

### Prerequisites

- A server with Docker and Docker Compose installed
- Port 3000 (web) and 8080 (worker) accessible

### Steps

1. Clone the repository:

   ```bash
   git clone https://github.com/your-org/sovra.git
   cd sovra
   ```

2. Copy and fill in environment variables:

   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

3. Build and start services:

   ```bash
   docker compose -f docker/compose.prod.yaml up -d
   ```

4. Verify both services are healthy:

   ```bash
   curl http://localhost:3000/api/health
   curl http://localhost:8080/health
   ```

### Updates

```bash
docker compose -f docker/compose.prod.yaml pull
docker compose -f docker/compose.prod.yaml up -d
```

---

## Option 2: Railway

Railway offers zero-config deploys from a GitHub repo. Recommended for quick starts and small teams.

### Prerequisites

- Railway account at [railway.app](https://railway.app)
- Railway CLI: `npm install -g @railway/cli`

### Steps

1. Create a new project in the Railway dashboard.

2. Add two services from the same GitHub repo:
   - **sovra-web** - set root directory to repo root
   - **sovra-worker** - set root directory to repo root

3. For each service, Railway will auto-detect the TOML config from `platform/railway/`:
   - Web service uses `platform/railway/railway.web.toml`
   - Worker service uses `platform/railway/railway.worker.toml`

4. Add environment variables in the Railway dashboard for each service. Refer to `docs/environment-variables.md` for the full list.

5. Deploy via Railway dashboard or CLI:

   ```bash
   railway login
   railway up
   ```

6. Verify deployment:

   ```bash
   # Replace with your Railway service URL
   curl https://your-web-service.railway.app/api/health
   ```

### Notes

- Railway injects `PORT` automatically. The web service reads it at startup.
- Use Railway's service linking to pass `WORKER_URL` from the worker service to the web service.

---

## Option 3: GCP Cloud Run

Serverless containers with automatic scaling. Ideal for GCP users.

### Prerequisites

- Google Cloud project with billing enabled
- `gcloud` CLI installed and authenticated
- Cloud Run API, Container Registry API, and Cloud Build API enabled

### Steps

1. Authenticate with GCP:

   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

2. Enable required APIs:

   ```bash
   gcloud services enable run.googleapis.com containerregistry.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com
   ```

3. Create secrets in Secret Manager for each environment variable:

   ```bash
   echo -n "your-value" | gcloud secrets create sovra-SUPABASE_SERVICE_ROLE_KEY --data-file=-
   # Repeat for each secret listed in docs/environment-variables.md
   ```

4. Grant the Cloud Run service account access to secrets:

   ```bash
   PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format='value(projectNumber)')
   gcloud secrets add-iam-policy-binding sovra-SUPABASE_SERVICE_ROLE_KEY \
     --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"
   ```

5. Build and deploy using Cloud Build:

   ```bash
   gcloud builds submit --config platform/gcp/cloudbuild.yaml \
     --substitutions _REGION=us-central1
   ```

   Or deploy manually:

   ```bash
   # Build and push web image
   docker build -t gcr.io/YOUR_PROJECT_ID/sovra-web:latest packages/web
   docker push gcr.io/YOUR_PROJECT_ID/sovra-web:latest

   # Deploy web service
   gcloud run deploy sovra-web \
     --image gcr.io/YOUR_PROJECT_ID/sovra-web:latest \
     --region us-central1 \
     --platform managed \
     --port 3000

   # Build and push worker image
   docker build -t gcr.io/YOUR_PROJECT_ID/sovra-worker:latest packages/worker
   docker push gcr.io/YOUR_PROJECT_ID/sovra-worker:latest

   # Deploy worker service
   gcloud run deploy sovra-worker \
     --image gcr.io/YOUR_PROJECT_ID/sovra-worker:latest \
     --region us-central1 \
     --platform managed \
     --port 8080
   ```

6. Verify both services are running:

   ```bash
   gcloud run services describe sovra-web --region us-central1 --format 'value(status.url)'
   gcloud run services describe sovra-worker --region us-central1 --format 'value(status.url)'
   ```

### Notes

- Cloud Run services are private by default (`--no-allow-unauthenticated`). Use Cloud IAM or an API gateway for public access.
- Set `WORKER_URL` in the web service to the internal URL of the worker Cloud Run service.
- See `platform/gcp/service.web.yaml` and `platform/gcp/service.worker.yaml` for the full service specs.

---

## Option 4: AWS ECS Fargate

Production-grade containerized deployment on AWS. Suitable for enterprise workloads.

### Prerequisites

- AWS account with appropriate IAM permissions
- AWS CLI installed and configured
- Docker installed locally

### Steps

1. Create ECR repositories:

   ```bash
   aws ecr create-repository --repository-name sovra-web --region YOUR_REGION
   aws ecr create-repository --repository-name sovra-worker --region YOUR_REGION
   ```

2. Authenticate Docker with ECR:

   ```bash
   aws ecr get-login-password --region YOUR_REGION | \
     docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com
   ```

3. Build and push images:

   ```bash
   # Web
   docker build -t YOUR_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com/sovra-web:latest packages/web
   docker push YOUR_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com/sovra-web:latest

   # Worker
   docker build -t YOUR_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com/sovra-worker:latest packages/worker
   docker push YOUR_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com/sovra-worker:latest
   ```

4. Store secrets in AWS Secrets Manager:

   ```bash
   aws secretsmanager create-secret \
     --name sovra/SUPABASE_SERVICE_ROLE_KEY \
     --secret-string "your-service-role-key"
   # Repeat for each secret
   ```

5. Create ECS cluster:

   ```bash
   aws ecs create-cluster --cluster-name sovra
   ```

6. Create CloudWatch log groups:

   ```bash
   aws logs create-log-group --log-group-name /ecs/sovra-web
   aws logs create-log-group --log-group-name /ecs/sovra-worker
   ```

7. Register task definitions (substitute `AWS_ACCOUNT_ID`, `AWS_REGION`, `IMAGE_TAG`):

   ```bash
   # Replace placeholder variables in the task definition files first
   AWS_ACCOUNT_ID=123456789012 AWS_REGION=us-east-1 IMAGE_TAG=latest \
     envsubst < platform/aws/task-definition.web.json > /tmp/task-def-web.json

   aws ecs register-task-definition --cli-input-json file:///tmp/task-def-web.json

   AWS_ACCOUNT_ID=123456789012 AWS_REGION=us-east-1 IMAGE_TAG=latest \
     envsubst < platform/aws/task-definition.worker.json > /tmp/task-def-worker.json

   aws ecs register-task-definition --cli-input-json file:///tmp/task-def-worker.json
   ```

8. Create ECS services using the config in `platform/aws/ecs-service.json`. Fill in the subnet IDs, security group IDs, and ALB target group ARN, then:

   ```bash
   aws ecs create-service --cli-input-json file://platform/aws/ecs-service-web.json
   aws ecs create-service --cli-input-json file://platform/aws/ecs-service-worker.json
   ```

9. Verify services are running:

   ```bash
   aws ecs describe-services \
     --cluster sovra \
     --services sovra-web sovra-worker \
     --query 'services[*].{name:serviceName,status:status,running:runningCount}'
   ```

### Notes

- Task definitions reference secrets via Secrets Manager ARNs (not plaintext). See `platform/aws/task-definition.web.json`.
- The execution role (`ecsTaskExecutionRole`) needs `secretsmanager:GetSecretValue` permission for each secret.
- Use an Application Load Balancer for the web service to terminate TLS and route traffic.
- See `platform/aws/ecs-service.json` for full service definitions including load balancer config.

---

## Environment Variables

Refer to `docs/environment-variables.md` for a complete reference of all environment variables with required/optional flags and descriptions.

The `.env.example` file in the repo root contains all variables grouped by category. Copy it to `.env.local` for local development:

```bash
cp .env.example .env.local
```

---

## Health Checks

Both services expose health endpoints used by all deployment platforms:

| Service | Endpoint | Expected Response |
|---|---|---|
| Web | `GET /api/health` | `{"status":"ok"}` |
| Worker | `GET /health` | `{"status":"ok"}` |

---

## CI/CD

GitHub Actions workflows are provided in `.github/workflows/`:

- `ci.yml` - Runs tests, type checks, and linting on pull requests
- `deploy.yml` - Builds Docker images and pushes to GitHub Container Registry (GHCR) on every merge to main

Images are tagged with both the commit SHA and `latest`. To deploy a specific version, use the SHA tag.
