# Deployment Guide — Vercel (Admin UI) + Render (Backend) + Neon (Database)

| Part | Platform | What it runs |
|------|----------|--------------|
| **Admin UI** | [Vercel](https://vercel.com) | React/Vite static app |
| **Backend API** | [Render](https://render.com) | Node.js Express API |
| **Database** | [Neon](https://neon.tech) | PostgreSQL (free tier) |

File uploads stay on a Render **persistent disk** (`/var/data/uploads`). Schema and content live in Neon.

---

## Prerequisites

1. Code pushed to **GitHub**
2. Free accounts: [Neon](https://neon.tech), [Render](https://render.com), [Vercel](https://vercel.com)

You only paste **one external credential**: Neon’s `DATABASE_URL` into Render. Everything else is auto-generated or set from URLs.

---

## Step 1 — Create a Neon database

1. Go to [console.neon.tech](https://console.neon.tech) → **New Project**
2. Name it (e.g. `cms-prototype`) → pick a region close to your Render region
3. After creation, open **Dashboard** → **Connection details**
4. Copy the **connection string** (PostgreSQL)
   - Use the **pooled** connection string if Neon offers it (recommended for serverless/Render)
   - Ensure it includes SSL, e.g.:
     ```
     postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
     ```
5. Keep this tab open — you’ll paste it into Render in Step 2

> Neon free tier includes one project with plenty of storage for a prototype. No credit card required for the free tier in most regions.

---

## Step 2 — Deploy backend on Render

### Option A: Blueprint (recommended)

1. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**
2. Connect your GitHub repo
3. Render reads `render.yaml` and creates **cms-backend** with:
   - `DB_CLIENT=pg`
   - Persistent disk at `/var/data` (uploads only)
   - `SECRET_KEY` auto-generated
4. Before or right after apply, open **cms-backend** → **Environment** and set:

   | Variable | Value |
   |----------|-------|
   | `DATABASE_URL` | Paste Neon connection string from Step 1 |
   | `ADMIN_UI_URL` | Leave blank until Step 4 (Vercel URL) |

5. **Remove** these if present from an older SQLite deploy:
   - `DB_FILE`
   - Any `DB_CLIENT=sqlite3`

6. Wait for deploy. First boot runs migrations + seeds (creates admin user).

### Option B: Manual web service

| Setting | Value |
|---------|-------|
| **Root Directory** | `backend` |
| **Build Command** | `npm install --include=dev && npm run build` |
| **Start Command** | `npm run start:prod` |
| **Health Check Path** | `/server/health` |

**Disks** → Add disk: mount `/var/data`, 1 GB (uploads)

**Environment:**

```env
NODE_ENV=production
DB_CLIENT=pg
DATABASE_URL=<Neon connection string with ?sslmode=require>
SECRET_KEY=<long random string, or use Generate>
ADMIN_UI_URL=https://your-app.vercel.app
UPLOAD_DIR=/var/data/uploads
```

### Verify backend

```bash
curl https://your-backend.onrender.com/server/health
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
   | `VITE_API_URL` | `https://your-backend.onrender.com` (no trailing slash) |

4. Deploy → copy Vercel URL

---

## Step 4 — Link frontend ↔ backend

1. **Render** → **cms-backend** → **Environment** → set `ADMIN_UI_URL` to your Vercel URL (no trailing slash)
2. **Manual Deploy** → redeploy backend (CORS + cookies)
3. Open Vercel URL → login:

   | Email | Password |
   |-------|----------|
   | `admin@example.com` | `admin` |

Change the admin password after first login.

---

## Environment variables reference

### Neon

| Item | Notes |
|------|-------|
| **Connection string** | From Neon dashboard → Connection details |
| **SSL** | Append `?sslmode=require` if not already present |
| **Pooled URL** | Prefer Neon’s pooler endpoint for Render |

### Backend (Render)

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `production` |
| `DB_CLIENT` | Yes | `pg` |
| `DATABASE_URL` | Yes | Neon PostgreSQL URL |
| `SECRET_KEY` | Yes | JWT secret (auto-generated in Blueprint) |
| `ADMIN_UI_URL` | Yes | Full Vercel URL |
| `UPLOAD_DIR` | Yes | `/var/data/uploads` |
| `PORT` | Auto | Set by Render |

Do **not** set `DB_FILE` when using Neon.

### Admin UI (Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Render backend URL |

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

Set `DATABASE_URL` on Render to your Neon connection string and redeploy.

### `ECONNREFUSED` or SSL errors during migrate

- Confirm `?sslmode=require` on the Neon URL
- Use Neon’s **direct** or **pooled** string from the dashboard (don’t truncate the host)
- Check Neon project is not suspended (free tier idle limits)

### Login fails on Vercel

- `VITE_API_URL` set on Vercel and redeployed
- `ADMIN_UI_URL` on Render exactly matches Vercel URL
- Redeploy backend after changing `ADMIN_UI_URL`

### CORS errors

`ADMIN_UI_URL` must match the exact origin (scheme + host, no trailing slash).

### File uploads disappear after redeploy

Ensure Render disk is mounted at `/var/data` and `UPLOAD_DIR=/var/data/uploads`.

### Cold starts on Render

First request after idle may take 30–60 seconds on starter tier.

### Reset Neon database

In Neon SQL Editor: drop and recreate the database, or create a new branch, then update `DATABASE_URL` on Render and redeploy (migrations + seeds run on startup).

---

## Quick checklist

- [ ] Neon project created, connection string copied
- [ ] Render backend deployed with `DB_CLIENT=pg` + `DATABASE_URL`
- [ ] Render disk mounted at `/var/data` for uploads
- [ ] `/server/health` returns `db: connected`
- [ ] Vercel deployed with `VITE_API_URL`
- [ ] `ADMIN_UI_URL` set on Render, backend redeployed
- [ ] Login works with `admin@example.com` / `admin`
