# Deployment Guide — Vercel (Admin UI) + Railway (Backend) + Supabase (Database)

| Part | Platform | What it runs |
|------|----------|--------------|
| **Admin UI** | [Vercel](https://vercel.com) | React/Vite static app |
| **Backend API** | [Railway](https://railway.com) | Node.js Express API |
| **Database** | [Supabase](https://supabase.com) | PostgreSQL (free tier) |

File uploads stay on a Railway **volume** (`/data/uploads`). Schema and content live in Supabase Postgres.

---

## Prerequisites

1. Code pushed to **GitHub**
2. Free accounts: [Supabase](https://supabase.com), [Railway](https://railway.com), [Vercel](https://vercel.com)

You only paste **one external credential**: Supabase’s `DATABASE_URL` into Railway. Everything else is auto-generated or set from URLs.

---

## Step 1 — Create a Supabase database

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. Name it (e.g. `cms-prototype`) → set a **database password** (save it)
3. Pick a region close to your Railway region → **Create new project**
4. When ready, open **Project Settings** → **Database**
5. Under **Connection string**, choose **URI** and copy it
   - For Railway (long-running Node server), use **Direct connection** or **Session pooler**
   - Avoid **Transaction pooler** (port 6543) for migrations/seeds — it can break DDL
6. Replace `[YOUR-PASSWORD]` in the URI with your database password  
   URL-encode special characters in the password if needed
7. Ensure SSL is enabled, e.g. append if missing:
   ```
   postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres?sslmode=require
   ```

Example (Session pooler — also fine for Railway):

```
postgresql://postgres.xxxxx:YOUR_PASSWORD@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require
```

Keep this connection string — you’ll paste it into Railway as `DATABASE_URL` in Step 2.

> Supabase free tier is enough for a prototype. You do **not** need Supabase Auth or Storage for this CMS — only the Postgres database.

---

## Step 2 — Deploy backend (Railway or Render)

**Recommended: use the repo `Dockerfile`** — it fixes monorepo, Node 20, and native module (`sharp`) issues that break Nixpacks builds.

### Railway (Docker)

1. [railway.com](https://railway.com) → **New Project** → **Deploy from GitHub repo**
2. **Settings** → **Root Directory** → leave **empty** (repo root)
3. Railway auto-detects `Dockerfile` — **do not** override build/start commands manually
4. **Variables**:

   | Variable | Value |
   |----------|--------|
   | `NODE_ENV` | `production` |
   | `DB_CLIENT` | `pg` |
   | `DATABASE_URL` | Supabase URI from Step 1 |
   | `SECRET_KEY` | long random string |
   | `UPLOAD_DIR` | `/data/uploads` |
   | `NIXPACKS_NODE_VERSION` | *(not needed with Docker)* |

5. **Volumes** → mount `/data` (for uploads)
6. **Networking** → **Generate Domain**

### Render (Docker)

1. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**
2. Connect GitHub repo — `render.yaml` uses `runtime: docker` and `./Dockerfile`
3. Set `DATABASE_URL` (Supabase) when prompted
4. Ensure disk is mounted at `/var/data`, `UPLOAD_DIR=/var/data/uploads`

### Verify backend

```bash
curl https://YOUR-BACKEND-URL/server/health
```

Expected: `{"data":{"status":"ok","db":"connected"}}`

Logs should show:

```
==> Running migrations...
==> Running seeds...
==> Starting API server...
CMS backend listening on ...
```

---

### Alternative: Railway Nixpacks (no Docker)

Only use this if Docker is unavailable. Pick **one** setup:

#### Option A — Repo root

| Setting | Value |
|---------|--------|
| **Root Directory** | *(empty)* |
| **Build Command** | `npm ci && npm run build -w backend` |
| **Start Command** | `npm run start:prod -w backend` |

#### Option B — Backend folder

| Setting | Value |
|---------|--------|
| **Root Directory** | `backend` |
| **Build Command** | `npm install --include=dev && npm run build` |
| **Start Command** | `npm run start:prod` |

Set **`NIXPACKS_NODE_VERSION`** = `20`. **Do not** use `-w backend` with Option B.

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

Send only the **Vercel URL** (not Railway or Supabase):

```
CMS Prototype Demo
URL:      https://your-app.vercel.app
Email:    admin@example.com
Password: admin
```

---

## Environment variables reference

### Supabase

| Item | Notes |
|------|-------|
| **Connection string** | Project Settings → Database → Connection string → URI |
| **Direct vs pooler** | Use **Direct** or **Session pooler** for migrations; avoid Transaction pooler (6543) |
| **SSL** | Append `?sslmode=require` if not in the URI |
| **Password** | Replace `[YOUR-PASSWORD]`; URL-encode special characters |

### Backend (Railway)

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `production` |
| `DB_CLIENT` | Yes | `pg` |
| `DATABASE_URL` | Yes | Supabase PostgreSQL URI |
| `SECRET_KEY` | Yes | JWT secret |
| `ADMIN_UI_URL` | Yes | Full Vercel URL |
| `UPLOAD_DIR` | Yes | `/data/uploads` |
| `PORT` | Auto | Set by Railway |

### Admin UI (Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Railway backend URL |

---

## Local development with Supabase (optional)

Match production by pointing local `.env` at Supabase:

```bash
cp backend/.env.example backend/.env
```

```env
DB_CLIENT=pg
DATABASE_URL=postgresql://postgres:...@db.xxxxx.supabase.co:5432/postgres?sslmode=require
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

For offline local dev without Supabase:

```env
DB_CLIENT=sqlite3
DB_FILE=./data/cms.db
```

See README for `npm run db:setup`.

---

## Troubleshooting

### `DATABASE_URL is required in production when DB_CLIENT=pg`

Set `DATABASE_URL` on Railway to your Supabase URI and redeploy.

### Migrations or seeds fail on deploy

- Use **Direct** or **Session pooler** connection string, not Transaction pooler (6543)
- Reset database: Supabase → **Database** → **Reset database** (or create a new project), update `DATABASE_URL`, redeploy Railway

### `password authentication failed`

- Password in URI must match the project database password
- URL-encode `@`, `#`, `/`, etc. in passwords

### Login fails on Vercel

- `VITE_API_URL` set on Vercel and redeployed
- `ADMIN_UI_URL` on Railway exactly matches Vercel URL (no trailing slash)

### CORS errors

`ADMIN_UI_URL` must match the exact origin (scheme + host, no trailing slash).

### File uploads disappear after redeploy

Ensure a Railway **volume** is mounted at `/data` and `UPLOAD_DIR=/data/uploads`.

### Slow first request

Railway free tier may sleep idle services — open the URL once before a demo.

---

## Quick checklist

- [ ] Code pushed to GitHub
- [ ] Supabase project created, connection string copied (Direct or Session pooler)
- [ ] Railway backend deployed with `DB_CLIENT=pg` + `DATABASE_URL`
- [ ] Railway volume mounted at `/data` for uploads
- [ ] `/server/health` returns `db: connected`
- [ ] Vercel deployed with `VITE_API_URL` → Railway URL
- [ ] `ADMIN_UI_URL` set on Railway to Vercel URL
- [ ] Login works with `admin@example.com` / `admin`

---

## Alternatives

- **Neon** — swap Step 1 for [neon.tech](https://neon.tech); same `DATABASE_URL` + Railway setup
- **Render backend** — see `render.yaml`; use `/var/data/uploads` for `UPLOAD_DIR`
