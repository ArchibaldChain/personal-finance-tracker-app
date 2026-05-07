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

The Cloud Run service is named `aifintrack-backend`:

```bash
gcloud run deploy aifintrack-backend \
  --image us-central1-docker.pkg.dev/ai-fintrack-494915/ai-fintrack/backend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "$(grep -v '^#' backend/.env | grep -v '^$' | grep -E '^(DATABASE_URL|GOOGLE_CLIENT_ID|JWT_SECRET_KEY|JWT_EXPIRE_DAYS|OPENAI_API_KEY|CLASSIFICATION_ENABLED|CLASSIFICATION_MODEL)=' | tr '\n' ',' | sed 's/,$//')",CORS_ORIGINS='["https://your-app.pages.dev"]',ALLOW_LOCAL_AUTH=false
```

Replace `your-app.pages.dev` with your actual Cloudflare Pages URL.

After deploy, Cloud Run outputs the service URL. You can also look it up anytime:

```bash
gcloud run services describe aifintrack-backend --region us-central1 --format "value(status.url)"
```

Current URL: `https://aifintrack-backend-kw4jwb35sa-uc.a.run.app`

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
  --set-env-vars "$(grep -v '^#' backend/.env | grep -v '^$' | grep -E '^(DATABASE_URL|GOOGLE_CLIENT_ID|JWT_SECRET_KEY|JWT_EXPIRE_DAYS|OPENAI_API_KEY|CLASSIFICATION_ENABLED|CLASSIFICATION_MODEL)=' | tr '\n' ',' | sed 's/,$//')",CORS_ORIGINS='["https://your-app.pages.dev"]',ALLOW_LOCAL_AUTH=false
```

### Update environment variables only (no redeploy)

```bash
gcloud run services update aifintrack-backend \
  --region us-central1 \
  --set-env-vars CORS_ORIGINS='["https://your-app.pages.dev"]'
```

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
   - `VITE_API_BASE_URL` = `https://aifintrack-backend-kw4jwb35sa-uc.a.run.app` (your Cloud Run URL — used by `client.ts` to route API calls to the backend)
   - `VITE_GOOGLE_CLIENT_ID` = your Google OAuth 2.0 Client ID (same value as `GOOGLE_CLIENT_ID` in `backend/.env`)

### Redeploy after frontend changes

Push to your connected git branch — Cloudflare Pages rebuilds and redeploys automatically.

---

## Deployment order for first deploy

1. Deploy backend to Cloud Run → get the Cloud Run URL
2. Set up Cloudflare Pages → get the `*.pages.dev` URL
3. Update backend `CORS_ORIGINS` with the Cloudflare URL:
   ```bash
   gcloud run services update aifintrack-backend \
     --region us-central1 \
     --set-env-vars CORS_ORIGINS='["https://your-app.pages.dev"]'
   ```
4. Cloudflare Pages build already has the correct `VITE_API_BASE_URL` from step 1

---

## Environment variables reference

| Variable | Dev value | Production value |
|----------|-----------|-----------------|
| `DATABASE_URL` | `sqlite:///./finance.db` | Neon PostgreSQL URL |
| `CORS_ORIGINS` | `["http://localhost:5173"]` | `["https://your-app.pages.dev"]` |
| `GOOGLE_CLIENT_ID` | same | same |
| `JWT_SECRET_KEY` | local secret | same (or new) |
| `JWT_EXPIRE_DAYS` | `30` | `30` |
| `ALLOW_LOCAL_AUTH` | `true` | `false` |
| `OPENAI_API_KEY` | optional | optional |
| `VITE_API_BASE_URL` | unset (uses Vite proxy) | Cloud Run URL |
| `VITE_GOOGLE_CLIENT_ID` | unset (uses backend value) | Google OAuth 2.0 Client ID |

---

## Verify deployment

```bash
# Check backend health
curl https://aifintrack-backend-kw4jwb35sa-uc.a.run.app/health

# View Cloud Run logs
gcloud run logs read aifintrack-backend --region us-central1

# List all services (to check for unused ones)
gcloud run services list --region us-central1
```
