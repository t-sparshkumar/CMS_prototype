# Deployment Guide — Vercel (Admin UI) + Railway (Backend) + Neon (Database)

| Part | Platform | What it runs |
|------|----------|--------------|
| **Admin UI** | [Vercel](https://vercel.com) | React/Vite static app |
| **Backend API** | [Railway](https://railway.com) | Node.js Express API |
| **Database** | [Neon](https://neon.tech) | PostgreSQL (free tier) |

File uploads stay on a Railway **volume** (`/data/uploads`). Schema and content live in Neon.

---

## Prerequisites

1. Code pushed to **GitHub**
2. Free accounts: [Neon](https://neon.tech), [Railway](https://railway.com), [Vercel](https://vercel.com)

You only paste **one external credential**: Neon’s `DATABASE_URL` into Railway. Everything else is auto-generated or set from URLs.

---

## Step 1 — Create a Neon database

1. Go to [console.neon.tech](https://console.neon.tech) → **New Project**
2. Name it (e.g. `cms-prototype`) → pick a region close to your Railway region
3. After creation, open **Dashboard** → **Connection details**
4. Copy the **connection string** (PostgreSQL)
   - Use the **pooled** connection string if Neon offers it (recommended)
   - Ensure it includes SSL, e.g.:
     ```
     postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
     ```
5. Keep this tab open — you’ll paste it into Railway in Step 2

> Neon free tier includes one project with plenty of storage for a prototype. No credit card required for the free tier in most regions.

---

## Step 2 — Deploy backend on Railway

### 2a — Create the service

1. Go to [railway.com](https://railway.com) → sign up with **GitHub**
2. **New Project** → **Deploy from GitHub repo** → select your `CMS_PROTOTYPE` repo
3. Railway creates a service — open it → **Settings**:

   | Setting | Value |
   |---------|--------|
   | **Root Directory** | *(leave empty — use repo root)* |
   | **Build Command** | `npm ci && npm run build -w backend` |
   | **Start Command** | `npm run start:prod -w backend` |
   | **Health Check Path** | `/server/health` |

   > `railway.toml` and `nixpacks.toml` at the repo root mirror these settings.

4. **Settings** → **Networking** → **Generate Domain**  
   Copy your public URL, e.g. `https://cms-backend-production.up.railway.app` (no trailing slash).

### 2b — Add a volume for uploads

1. In the same service → **Volumes** → **Add Volume**
2. **Mount path:** `/data`
3. This keeps uploaded files across redeploys.

### 2c — Environment variables

Open **Variables** and add:

| Variable | Value |
|----------|--------|
| `NODE_ENV` | `production` |
| `DB_CLIENT` | `pg` |
| `DATABASE_URL` | Neon connection string from Step 1 |
| `SECRET_KEY` | Long random string (Railway can generate one) |
| `UPLOAD_DIR` | `/data/uploads` |
| `ADMIN_UI_URL` | Leave blank until Step 4 (Vercel URL) |

Railway sets `PORT` automatically — do not override it.

### 2d — Deploy and verify

1. Trigger a deploy (push to GitHub or **Deploy** in Railway)
2. Wait for logs to show:
   ```
   Batch 1 run: 22 migrations
   Ran 9 seed files
   CMS backend listening on ...
   ```
3. Verify:
   ```bash
   curl https://YOUR-SERVICE.up.railway.app/server/health
   ```
   Expected: `{"data":{"status":"ok","db":"connected"}}`

---

## Step 3 — Deploy admin UI on Vercel

1. [Vercel](https://vercel.com/new) → Import GitHub repo
2. Configure:

   | Setting | Value |
   |---------|-------|
   | **Framework Preset** | Vite |
   | **Root Directory** | `admin-ui` |
   | **Build Command** | `npm run build` |
   | **Output Directory** | `dist` |

3. Environment variable:

   | Name | Value |
   |------|-------|
   | `VITE_API_URL` | `https://YOUR-SERVICE.up.railway.app` (no trailing slash) |

4. Deploy → copy Vercel URL

---

## Step 4 — Link frontend ↔ backend

1. **Railway** → your backend service → **Variables** → set `ADMIN_UI_URL` to your Vercel URL (no trailing slash)
2. Railway redeploys automatically when variables change
3. Open Vercel URL → login:

   | Email | Password |
   |-------|----------|
   | `admin@example.com` | `admin` |

Change the admin password after first login.

---

## What to share with your manager

Send only the **Vercel URL** (not Railway or Neon):

```
CMS Prototype Demo
URL:      https://your-app.vercel.app
Email:    admin@example.com
Password: admin
```

---

## Environment variables reference

### Neon

| Item | Notes |
|------|-------|
| **Connection string** | From Neon dashboard → Connection details |
| **SSL** | Append `?sslmode=require` if not already present |
| **Pooled URL** | Prefer Neon’s pooler endpoint for Railway |

### Backend (Railway)

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `production` |
| `DB_CLIENT` | Yes | `pg` |
| `DATABASE_URL` | Yes | Neon PostgreSQL URL |
| `SECRET_KEY` | Yes | JWT secret |
| `ADMIN_UI_URL` | Yes | Full Vercel URL |
| `UPLOAD_DIR` | Yes | `/data/uploads` |
| `PORT` | Auto | Set by Railway |

Do **not** set `DB_FILE` when using Neon.

### Admin UI (Vercel)

| Variable | Required | Description |
|------|----------|-------------|
| `VITE_API_URL` | Yes | Railway backend URL |

---

## Local development with Neon (optional)

Use Neon for local dev too so you match production:

```bash
cp backend/.env.example backend/.env
```

```env
DB_CLIENT=pg
DATABASE_URL=postgresql://...@ep-xxx.neon.tech/neondb?sslmode=require
SECRET_KEY=local-dev-secret
ADMIN_UI_URL=http://localhost:5173
```

```bash
npm run db:setup -w backend
npm run dev:backend
npm run dev:admin
```

---

## SQLite alternative (local only)

For offline local dev without Neon, keep defaults in `.env`:

```env
DB_CLIENT=sqlite3
DB_FILE=./data/cms.db
```

See README for `npm run db:setup`.

---

## Troubleshooting

### `DATABASE_URL is required in production when DB_CLIENT=pg`

Set `DATABASE_URL` on Railway to your Neon connection string and redeploy.

### Migrations or seeds fail on deploy

Reset Neon (new project or **Reset database**), update `DATABASE_URL` if needed, redeploy Railway.

### Login fails on Vercel

- `VITE_API_URL` set on Vercel and redeployed
- `ADMIN_UI_URL` on Railway exactly matches Vercel URL (no trailing slash)
- Redeploy backend after changing `ADMIN_UI_URL`

### CORS errors

`ADMIN_UI_URL` must match the exact origin (scheme + host, no trailing slash).

### File uploads disappear after redeploy

Ensure a Railway **volume** is mounted at `/data` and `UPLOAD_DIR=/data/uploads`.

### Slow first request

Railway free tier may sleep idle services — first load can take 15–30 seconds. Open the URL once before a demo.

### Reset Neon database

In Neon SQL Editor: drop and recreate the database, or create a new branch, then update `DATABASE_URL` on Railway and redeploy.

---

## Quick checklist

- [ ] Code pushed to GitHub
- [ ] Neon project created, connection string copied
- [ ] Railway backend deployed with `DB_CLIENT=pg` + `DATABASE_URL`
- [ ] Railway volume mounted at `/data` for uploads
- [ ] `/server/health` returns `db: connected`
- [ ] Vercel deployed with `VITE_API_URL` → Railway URL
- [ ] `ADMIN_UI_URL` set on Railway to Vercel URL
- [ ] Login works with `admin@example.com` / `admin`

---

## Alternative: Render backend

`render.yaml` in the repo still supports [Render](https://render.com) if you prefer it. Use `/var/data/uploads` instead of `/data/uploads` for `UPLOAD_DIR`.
