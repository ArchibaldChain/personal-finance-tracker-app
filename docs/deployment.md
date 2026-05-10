# Deployment Guide

## Architecture

- **Backend**: Docker container on Google Cloud Run
- **Frontend**: Static site on Cloudflare Pages
- **Database**: Neon PostgreSQL (managed, no deployment needed)

---

## Prerequisites

- `gcloud` CLI installed and authenticated (`gcloud auth login`)
- Docker installed locally
- Active billing account linked to GCP project `ai-fintrack-494915`
- `backend/.env.production` file with production env vars (gitignored — do not commit)

---

## Backend — Google Cloud Run

### One-time setup

```bash
# Set project
gcloud config set project ai-fintrack-494915

# Enable required APIs
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com
```

The Artifact Registry repository `ai-fintrack` already exists at:
`us-central1-docker.pkg.dev/ai-fintrack-494915/ai-fintrack`

### Build and push image

Run from the repo root. Cloud Build builds on Google's AMD64 servers (avoids Mac ARM architecture mismatch):

```bash
gcloud builds submit \
  --tag us-central1-docker.pkg.dev/ai-fintrack-494915/ai-fintrack/backend:latest \
  ./backend
```

### Deploy to Cloud Run

The Cloud Run service is named `aifintrack-backend`. Secrets come from `backend/.env.production`; tricky vars like `CORS_ORIGINS` are in `backend/deploy-flags.yaml` (gcloud handles the JSON array escaping internally):

```bash
gcloud run deploy aifintrack-backend \
  --image us-central1-docker.pkg.dev/ai-fintrack-494915/ai-fintrack/backend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --flags-file backend/deploy-flags.yaml \
  --set-env-vars "$(grep -v '^#' backend/.env.production | grep -v '^$' | grep -v 'CORS_ORIGINS\|ALLOW_LOCAL_AUTH' | tr '\n' ',' | sed 's/,$//')"
```

To update `CORS_ORIGINS`, edit `backend/deploy-flags.yaml` and redeploy.

After deploy, Cloud Run outputs the service URL. You can also look it up anytime:

```bash
gcloud run services describe aifintrack-backend --region us-central1 --format "value(status.url)"
```

Current URL: `https://aifintrack-backend-676441098167.us-central1.run.app`

### Redeploy after code changes

```bash
# Rebuild and push
gcloud builds submit \
  --tag us-central1-docker.pkg.dev/ai-fintrack-494915/ai-fintrack/backend:latest \
  ./backend

# Redeploy
gcloud run deploy aifintrack-backend \
  --image us-central1-docker.pkg.dev/ai-fintrack-494915/ai-fintrack/backend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --flags-file backend/deploy-flags.yaml \
  --set-env-vars "$(grep -v '^#' backend/.env.production | grep -v '^$' | grep -v 'CORS_ORIGINS\|ALLOW_LOCAL_AUTH' | tr '\n' ',' | sed 's/,$//')"
```

> **Note:** Always use `gcloud run deploy` with `--image` explicitly — do not use `gcloud run services update` as it can fail to resolve the image correctly.

### List all Cloud Run services

```bash
gcloud run services list --region us-central1
```

---

## Frontend — Cloudflare Pages

### One-time setup (in Cloudflare dashboard)

1. Go to **Workers & Pages → Create → Pages → Connect to Git**
2. Select your repository
3. Configure build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `frontend`
4. Add environment variables:
   - `VITE_API_BASE_URL` = `https://aifintrack-backend-676441098167.us-central1.run.app` (Cloud Run URL — routes API calls to the backend)
   - `VITE_GOOGLE_CLIENT_ID` = Google OAuth 2.0 Client ID (same value as `GOOGLE_CLIENT_ID` in `backend/.env`)

### Redeploy after frontend changes

Push to your connected git branch — Cloudflare Pages rebuilds and redeploys automatically.

---

## Deployment order for first deploy

1. Deploy backend to Cloud Run → get the Cloud Run URL
2. Set up Cloudflare Pages with `VITE_API_BASE_URL` pointing to Cloud Run URL
3. Add your custom domain in Cloudflare Pages → **Custom Domains**
4. Update `CORS_ORIGINS` in `backend/.env.production` to include your custom domain, then redeploy backend

---

## Environment variables reference

| Variable | Dev (`.env`) | Production (`.env.production`) |
|----------|-------------|-------------------------------|
| `DATABASE_URL` | SQLite path | Neon PostgreSQL URL |
| `CORS_ORIGINS` | `["http://localhost:5173"]` | `["https://ai-fintrack.com","https://www.ai-fintrack.com"]` |
| `GOOGLE_CLIENT_ID` | same | same |
| `JWT_SECRET_KEY` | local secret | same (or new) |
| `JWT_EXPIRE_DAYS` | `30` | `30` |
| `ALLOW_LOCAL_AUTH` | `true` | `false` |
| `OPENAI_API_KEY` | optional | optional |
| `VITE_API_BASE_URL` | unset (uses Vite proxy) | Cloud Run URL |
| `VITE_GOOGLE_CLIENT_ID` | unset | Google OAuth 2.0 Client ID |

---

## Verify deployment

```bash
# Check backend health
curl https://aifintrack-backend-676441098167.us-central1.run.app/health

# View Cloud Run logs
gcloud run services logs read aifintrack-backend --region us-central1

# List all services
gcloud run services list --region us-central1
```
