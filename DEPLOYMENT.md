# Deploy: Neon (DB) + Railway (Backend) + Vercel (Admin UI)

| Layer | Platform | You configure |
|-------|----------|---------------|
| Database | [Neon](https://neon.tech) | `DATABASE_URL` → Railway |
| Backend | [Railway](https://railway.com) | Docker from repo `Dockerfile` |
| Admin UI | [Vercel](https://vercel.com) | `BACKEND_URL` → Railway (proxy); leave `VITE_API_URL` unset |

Uploads are stored on a Railway **volume** at `/data/uploads`. Schema + content live in Neon.

---

## Before you start

- [ ] Latest code on GitHub (`main` branch includes `Dockerfile`)
- [ ] Vercel admin UI already deployed (you have the URL)
- [ ] Neon + Railway accounts (free tier is fine)

---

## Step 1 — Neon database

1. Go to [console.neon.tech](https://console.neon.tech) → **New Project**
2. Name: `cms-prototype` → pick a region near Railway
3. **Dashboard** → **Connect** → copy the **pooled** connection string
4. Must include SSL, e.g.:
   ```
   postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
5. Save this as `DATABASE_URL` — paste into Railway in Step 2

**If a previous deploy failed:** Neon → **Reset branch** / new project so migrations run on a clean DB.

---

## Step 2 — Railway backend (Docker)

### Create service

1. [railway.app/new](https://railway.app/new) → **GitHub Repo** → select this repo
2. **Settings** → **Root Directory** → leave **blank** (repo root)
3. **Settings** → **Builder** → must use **Dockerfile** (auto-detected from repo)
4. **Delete/clear** any custom Build Command or Start Command in the UI (Dockerfile handles both)

### Volume (file uploads)

1. Service → **Volumes** → **Add Volume**
2. Mount path: `/data`

### Environment variables

Service → **Variables**:

| Variable | Value |
|----------|--------|
| `NODE_ENV` | `production` |
| `DB_CLIENT` | `pg` |
| `DATABASE_URL` | Neon pooled string from Step 1 |
| `SECRET_KEY` | Generate a long random string |
| `UPLOAD_DIR` | `/data/uploads` |
| `ADMIN_UI_URL` | Your **Vercel** URL, e.g. `https://your-app.vercel.app` (no trailing slash) |

Do **not** set `DB_FILE`. Do **not** set `PORT` (Railway injects it).

### Domain

1. **Settings** → **Networking** → **Generate Domain**
2. Copy URL, e.g. `https://cms-backend-production.up.railway.app`

### Deploy & verify

Wait for deploy logs:

```
==> Running migrations...
==> Running seeds...
==> Starting API server...
CMS backend listening on ...
```

Test:

```bash
curl https://YOUR-RAILWAY-URL.up.railway.app/server/health
```

Expected: `{"data":{"status":"ok","db":"connected"}}`

**Login after seeds:** `admin@example.com` / `admin`

---

## Step 3 — Vercel admin UI

### Environment variables

1. Vercel → your project → **Settings** → **Environment Variables**
2. Set:

   | Name | Value |
   |------|--------|
   | `BACKEND_URL` | `https://YOUR-RAILWAY-URL.up.railway.app` (no trailing slash) |

3. **Remove `VITE_API_URL`** if it exists — the Vercel proxy sends API calls same-origin (required for mobile Safari login).

4. **Deployments** → **Redeploy** (required — env is baked at build time for Vite; middleware reads `BACKEND_URL` at runtime).

5. Open your Vercel URL → login with `admin@example.com` / `admin`

**Why `BACKEND_URL` not `VITE_API_URL`?** Mobile Safari blocks third-party cookies. With `VITE_API_URL`, the browser talks to Railway directly (cross-origin). With `BACKEND_URL`, Vercel proxies `/auth`, `/api`, etc. so cookies work on all devices.

---

## Step 4 — Final link check

| Check | Expected |
|-------|----------|
| Railway `ADMIN_UI_URL` | Exact Vercel origin (https, no trailing `/`) |
| Vercel `BACKEND_URL` | Exact Railway origin (https, no trailing `/`) |
| Vercel `VITE_API_URL` | **Unset** (use proxy mode) |
| Health endpoint | `db: connected` |
| Login on Vercel | Works in incognito window |

If login fails: fix URLs → redeploy **both** Railway and Vercel.

---

## Share with your manager

```
URL:      https://your-app.vercel.app
Email:    admin@example.com
Password: admin
```

---

## Troubleshooting

### Build fails on Railway

- Root Directory must be **empty** (not `backend`)
- Use **Dockerfile** builder, not Nixpacks with `-w backend`
- Push latest `main` from GitHub

### `No workspaces found`

You set Root Directory = `backend` but build uses `-w backend`. Clear Root Directory or use Docker.

### Migrations / seeds fail

- Reset Neon database, redeploy Railway
- Confirm `DATABASE_URL` has `?sslmode=require`
- Use Neon **pooled** connection string

### CORS / login fails

- `ADMIN_UI_URL` on Railway must **exactly** match Vercel URL
- Redeploy Railway after changing it
- On mobile Safari: use `BACKEND_URL` proxy on Vercel and **remove** `VITE_API_URL`
- Test desktop in **incognito** — if that fails too, URLs/env are misconfigured

### `DATABASE_URL is required`

Set `DB_CLIENT=pg` and `DATABASE_URL` on Railway.

### Slow first request

Railway free tier sleeps when idle — open the URL once before a demo.

---

## Quick checklist

- [ ] Neon project + pooled `DATABASE_URL`
- [ ] Railway: empty root dir, Docker, volume at `/data`
- [ ] Railway env vars set (including `ADMIN_UI_URL`)
- [ ] `/server/health` → `db: connected`
- [ ] Vercel `BACKEND_URL` → Railway URL; `VITE_API_URL` unset + redeploy
- [ ] Login works on Vercel

---

## Local dev (optional)

```env
# backend/.env
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

Do **not** set `VITE_API_URL` locally — Vite proxies to port 8055.
