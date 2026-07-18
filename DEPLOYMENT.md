# Deployment Guide — Vercel (Admin UI) + Render (Backend)

This CMS is split across two hosts:

| Part | Platform | What it runs |
|------|----------|--------------|
| **Admin UI** | [Vercel](https://vercel.com) | React/Vite static app |
| **Backend API** | [Render](https://render.com) | Node.js Express + SQLite (on persistent disk) |

---

## Prerequisites

1. GitHub repo pushed with this code
2. [Render](https://render.com) account
3. [Vercel](https://vercel.com) account
4. (Optional) [Neon](https://neon.tech) or Render Postgres if you prefer PostgreSQL over SQLite

---

## Step 1 — Deploy backend on Render (SQLite — no Postgres)

The default `render.yaml` uses **SQLite** stored on a **persistent disk** at `/var/data/cms.db`. No PostgreSQL setup required.

### Option A: Blueprint (recommended)

1. Go to [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**
2. Connect your GitHub repo
3. Render reads `render.yaml` at the repo root and creates:
   - **cms-backend** web service
   - **Persistent disk** at `/var/data` (database + uploads)
4. After deploy starts, open **cms-backend** → **Environment** and set:

   | Variable | Value |
   |----------|-------|
   | `ADMIN_UI_URL` | Your Vercel URL (set after Step 2), e.g. `https://cms-admin.vercel.app` |

5. Wait for deploy to finish. Copy the backend URL, e.g. `https://cms-backend.onrender.com`

### Option B: Manual web service (SQLite)

1. **New** → **Web Service** → connect repo
2. Settings:

   | Setting | Value |
   |---------|-------|
   | **Root Directory** | `backend` |
   | **Build Command** | `npm install --include=dev && npm run build` |
   | **Start Command** | `npm run start:prod` |
   | **Health Check Path** | `/server/health` |

3. **Disks** → Add disk:
   - **Mount path:** `/var/data`
   - **Size:** 1 GB (or more)

4. **Environment** variables:

   ```env
   NODE_ENV=production
   DB_CLIENT=sqlite3
   DB_FILE=/var/data/cms.db
   SECRET_KEY=<long random string>
   ADMIN_UI_URL=https://your-app.vercel.app
   UPLOAD_DIR=/var/data/uploads
   ```

   > **Do not set** `DATABASE_URL` or `DB_CLIENT=pg` when using SQLite.

5. **Remove** any existing `DATABASE_URL` variable if you previously tried Postgres.

### Option C: PostgreSQL (optional)

If you prefer Postgres instead of SQLite, see [Using PostgreSQL](#using-postgresql-optional) below.

### Verify backend

```bash
curl https://your-backend.onrender.com/server/health
```

Expected: `{"data":{"status":"ok","db":"connected"}}`

---

## Step 2 — Deploy admin UI on Vercel

1. Go to [Vercel Dashboard](https://vercel.com/new)
2. Import your GitHub repo
3. Configure project:

   | Setting | Value |
   |---------|-------|
   | **Framework Preset** | Vite |
   | **Root Directory** | `admin-ui` |
   | **Build Command** | `npm run build` |
   | **Output Directory** | `dist` |

4. Add environment variable:

   | Name | Value |
   |------|-------|
   | `VITE_API_URL` | `https://your-backend.onrender.com` (no trailing slash) |

5. Deploy

6. Copy your Vercel URL (e.g. `https://cms-admin.vercel.app`)

---

## Step 3 — Link frontend ↔ backend

1. **Render** → cms-backend → **Environment** → set `ADMIN_UI_URL` to your Vercel URL
2. **Redeploy** the backend (required for CORS + cookies)
3. Open your Vercel URL → login with:
   - **Email:** `admin@example.com`
   - **Password:** `admin`

> Change the admin password immediately after first login in production.

---

## Environment variables reference

### Backend (Render) — SQLite (default)

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `production` |
| `DB_CLIENT` | Yes | `sqlite3` |
| `DB_FILE` | Yes | `/var/data/cms.db` (must be on persistent disk) |
| `SECRET_KEY` | Yes | JWT signing secret (32+ random chars) |
| `ADMIN_UI_URL` | Yes | Full Vercel URL, e.g. `https://cms-admin.vercel.app` |
| `UPLOAD_DIR` | Yes | `/var/data/uploads` |
| `PORT` | Auto | Set by Render automatically |

Persistent disk **required** — mount at `/var/data` so SQLite DB and uploads survive redeploys.

### Admin UI (Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Render backend URL, e.g. `https://cms-backend.onrender.com` |

---

## Using PostgreSQL (optional)

Replace SQLite with Postgres if you need multi-instance scaling or external DB hosting.

1. Create a **PostgreSQL** database on Render (or [Neon](https://neon.tech))
2. On **cms-backend** → **Environment**:

   ```env
   DB_CLIENT=pg
   DATABASE_URL=<internal or external postgres URL>
   ```

3. **Remove** `DB_FILE` (not used with Postgres)
4. Redeploy

For Neon, append `?sslmode=require` to the connection string.

---

## Troubleshooting

### `ECONNREFUSED` during `knex migrate:latest`

**If you want SQLite (no Postgres):** you still have `DB_CLIENT=pg` set. Switch to SQLite:

| Variable | Value |
|----------|-------|
| `DB_CLIENT` | `sqlite3` |
| `DB_FILE` | `/var/data/cms.db` |
| `UPLOAD_DIR` | `/var/data/uploads` |

Delete `DATABASE_URL` if present. Add a **persistent disk** mounted at `/var/data`. Redeploy.

**If you want Postgres:** `DATABASE_URL` is missing or wrong — see [Using PostgreSQL](#using-postgresql-optional).

### `tsx: not found` or Render runs `npm run dev:backend`

Render is using the **wrong start command**. `dev:backend` is for local development only.

In **Render → your web service → Settings**:

| Setting | Correct value |
|---------|---------------|
| **Root Directory** | `backend` |
| **Build Command** | `npm install --include=dev && npm run build` |
| **Start Command** | `npm run start:prod` |

Do **not** use repo root with `npm run dev:backend`. Save settings and **Manual Deploy → Deploy latest**.

Recommended: delete the misconfigured service and redeploy via **Blueprint** (`render.yaml` at repo root) — it sets these values automatically.

### Login fails on Vercel
- Confirm `VITE_API_URL` is set on Vercel and redeployed
- Confirm `ADMIN_UI_URL` on Render exactly matches Vercel URL (no trailing slash)
- Redeploy backend after changing `ADMIN_UI_URL`

### CORS errors
- `ADMIN_UI_URL` must match the exact origin (scheme + host)

### Cookies / session not persisting
- Backend uses `SameSite=None; Secure` cookies in production for cross-origin auth

### File uploads disappear after redeploy
- Attach a Render persistent disk and set `UPLOAD_DIR=/var/data/uploads`

### Cold starts on Render
- First request after idle may take 30–60 seconds on starter tier

---

## Local development (unchanged)

```bash
npm install
cp backend/.env.example backend/.env
npm run db:setup
npm run dev:backend   # http://localhost:8055
npm run dev:admin     # http://localhost:5173
```

Do **not** set `VITE_API_URL` locally — the Vite dev proxy handles API routing.
