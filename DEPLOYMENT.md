# Deployment Guide — Vercel (Admin UI) + Render (Backend)

This CMS is split across two hosts:

| Part | Platform | What it runs |
|------|----------|--------------|
| **Admin UI** | [Vercel](https://vercel.com) | React/Vite static app |
| **Backend API** | [Render](https://render.com) | Node.js Express + PostgreSQL |

---

## Prerequisites

1. GitHub repo pushed with this code
2. [Render](https://render.com) account
3. [Vercel](https://vercel.com) account
4. (Optional) [Neon](https://neon.tech) if you prefer external Postgres instead of Render DB

---

## Step 1 — Deploy backend on Render

### Option A: Blueprint (recommended)

1. Go to [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**
2. Connect your GitHub repo
3. Render reads `render.yaml` at the repo root and creates:
   - **cms-backend** web service
   - **cms-db** PostgreSQL database
   - Persistent disk for file uploads (`/var/data/uploads`)
4. After deploy starts, open **cms-backend** → **Environment** and set:

   | Variable | Value |
   |----------|-------|
   | `ADMIN_UI_URL` | Your Vercel URL (set after Step 2), e.g. `https://cms-admin.vercel.app` |

5. Wait for deploy to finish. Copy the backend URL, e.g. `https://cms-backend.onrender.com`

### Option B: Manual web service

1. **New** → **Web Service** → connect repo
2. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install --include=dev && npm run build`
   - **Start Command:** `npm run start:prod`
   - **Health Check Path:** `/server/health`
3. Add a **PostgreSQL** database and set env vars:

   ```env
   NODE_ENV=production
   DB_CLIENT=pg
   DATABASE_URL=<postgres connection string>
   SECRET_KEY=<long random string>
   ADMIN_UI_URL=https://your-app.vercel.app
   UPLOAD_DIR=/var/data/uploads
   ```

4. (Recommended) Add a **Persistent Disk** mounted at `/var/data` so uploads survive redeploys.

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

### Backend (Render)

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `production` |
| `DB_CLIENT` | Yes | `pg` |
| `DATABASE_URL` | Yes* | Postgres connection string |
| `SECRET_KEY` | Yes | JWT signing secret (32+ random chars) |
| `ADMIN_UI_URL` | Yes | Full Vercel URL, e.g. `https://cms-admin.vercel.app` |
| `UPLOAD_DIR` | Yes | `/var/data/uploads` with persistent disk |
| `PORT` | Auto | Set by Render automatically |

### Admin UI (Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Render backend URL, e.g. `https://cms-backend.onrender.com` |

---

## Using Neon instead of Render Postgres

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the connection string
3. On Render backend, set:

   ```env
   DB_CLIENT=pg
   DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
   ```

---

## Troubleshooting

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
