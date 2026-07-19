# CMS Prototype

A Directus-style headless CMS with a visual admin dashboard, rich field interfaces, auto-generated REST + GraphQL APIs, and a built-in website/page builder.

**Repository:** [github.com/t-sparshkumar/CMS_prototype](https://github.com/t-sparshkumar/CMS_prototype)

---

## Table of contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Quick start (local development)](#quick-start-local-development)
5. [Developer guide](#developer-guide)
6. [Project structure](#project-structure)
7. [Database, migrations & seeds](#database-migrations--seeds)
8. [Scripts & testing](#scripts--testing)
9. [Admin UI routes](#admin-ui-routes)
10. [Field interfaces](#field-interfaces)
11. [API reference](#api-reference)
12. [Environment variables](#environment-variables)
13. [Deployment](#deployment)
14. [Troubleshooting](#troubleshooting)

---

## Overview

This monorepo contains two workspaces:

| Package | Purpose | Dev URL |
|---------|---------|---------|
| **`backend/`** | Express API, Knex ORM, GraphQL, auth, permissions, file storage | `http://localhost:8055` |
| **`admin-ui/`** | React admin dashboard (Vite + Tailwind) | `http://localhost:5173` |

### Features

- **Data model** — Collections, fields, relations (M2O, O2M, M2M, M2A, translations), schema export/import, drag-reorder
- **Field interfaces** — 40+ types (input, WYSIWYG, markdown, repeater, SEO, files, relations, groups, presentation fields) with live preview
- **Content editing** — Filter, search, sort, archive, bulk actions, conditional fields, group layouts (accordion/tabs)
- **Access control** — Roles, policies with per-collection CRUD matrix, field-level permissions, row-level filters
- **Users** — Admin CRUD for user accounts
- **Assets** — Google Drive–style gallery, folders, upload, image transforms (Sharp)
- **Website module** — Pages with M2A sections, reusable block collections, site header/footer blocks, in-admin page preview
- **Translations** — Multi-language content via `{collection}_translations` junction collections
- **Flows / triggers** — Event-driven automation (webhooks, schedules, manual runs)
- **APIs** — REST items/collections/fields + dynamic GraphQL schema
- **Admin UI** — Themed back-office shell (5 themes), sidebar nav, breadcrumbs, dashboard

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  admin-ui (React)                                               │
│  InterfaceRenderer · PageSectionsBuilder · WebsiteComponentRenderer│
└────────────────────────────┬────────────────────────────────────┘
                             │ REST /auth /files /assets /graphql
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  backend (Express)                                              │
│  routes → services → Knex → SQLite (dev) / PostgreSQL (prod)    │
└────────────────────────────┬────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
   cms_* meta tables   content tables      uploads/ + Sharp
   (schema, auth,       (pages, hero_*,     (file storage)
    permissions)        articles, …)
```

### How data is modeled

1. **Meta tables** (`cms_collections`, `cms_fields`, `cms_relations`, …) store schema definitions.
2. **Content tables** are created dynamically when you add a collection in the Data Model.
3. **Field interfaces** (e.g. `wysiwyg`, `repeater`, `many-to-any`) are UI/editor metadata stored on `cms_fields`; they do not change the underlying SQL column type.
4. **Permissions** are evaluated on every `/api/items/*` request via roles and policies.

### Auth flow

```
Login → access_token (JSON) + refresh_token (httpOnly cookie)
       → Admin UI stores access_token in memory (Zustand)
       → Page refresh → POST /auth/refresh (cookie) → new access_token
```

Production uses `SameSite=None; Secure` cookies so Vercel (admin) and Railway (API) can share sessions cross-origin.

---

## Prerequisites

- **Node.js** 20+ (LTS recommended)
- **npm** 9+ (workspaces)
- Optional: **Docker** for local PostgreSQL (`docker compose up -d postgres`)

---

## Quick start (local development)

```bash
# 1. Install dependencies (monorepo workspaces)
npm install

# 2. Configure backend
cp backend/.env.example backend/.env
# Edit SECRET_KEY if deploying; defaults are fine for local dev

# 3. Create DB, run migrations, seed sample data
npm run db:setup

# 4. Start both apps (two terminals)
npm run dev:backend   # → http://localhost:8055
npm run dev:admin     # → http://localhost:5173
```

**Default login (development only):**

| Email | Password |
|-------|----------|
| `admin@example.com` | `admin` |

> **Important:** Do **not** set `VITE_API_URL` locally. The Vite dev proxy forwards `/api`, `/auth`, `/files`, `/assets`, `/users`, and `/server` to the backend.  
> Vite uses `strictPort: true` on port **5173** — free that port before starting the admin UI.

### Verify setup

```bash
# Health check
curl http://localhost:8055/server/health

# API smoke tests (backend must be running)
npm run test:e2e:api
```

### Build for production

```bash
npm run build -w backend
npm run build -w admin-ui
```

---

## Developer guide

### Mental model: folders, collections, fields

| Concept | `is_group` | Has items? | Example |
|---------|------------|------------|---------|
| **Folder** | `true` | No — organizes other collections | `website` |
| **Collection** | `false` | Yes — holds content rows | `pages`, `hero_banners` |
| **Field** | — | Column + interface metadata | `title` (input), `sections` (many-to-any) |

Create flows in **Data Model** use modal dialogs with a categorized icon picker and optional color.

### Where editing happens

| Task | Primary code |
|------|--------------|
| Render any field in the content editor | `admin-ui/src/components/InterfaceRenderer.tsx` |
| Individual field UIs | `admin-ui/src/components/fields/` |
| Form layout / column spans | `admin-ui/src/components/FieldFormLayout.tsx` |
| Repeater & structured JSON | `RepeaterField.tsx`, `StructuredJsonField.tsx` |
| Responsive image groups | `ResponsiveImageGroupField.tsx` |
| Page M2A sections list | `PageSectionsBuilder.tsx` |
| Website block rendering (preview) | `admin-ui/src/components/website/` |
| REST API business logic | `backend/src/services/` |
| Block collection definitions | `backend/src/services/block-collections.service.ts` |
| Website module repair on boot | `backend/src/services/website.service.ts` |

### Content vs Pages vs Data Model

| Admin area | Purpose |
|------------|---------|
| **Content** (`/content`) | Edit items in any collection — block collections appear at the root |
| **Pages** (`/pages`) | Website pages dashboard + section builder (M2A) |
| **Data Model** (`/settings/data-model`) | Define collections, fields, relations — schema design |

For `pages`, the section list UI also appears when editing via **Content → pages** because both routes use the same `PageSectionsBuilder`.

### Website module & block collections

Block types are **real collections**, not JSON blobs. Authors create reusable block instances (e.g. a hero carousel row) in **Content**, then attach them to pages.

**Registered block collections** (see `block-collections.service.ts`):

`site_header`, `site_footer`, `hero_banners`, `hero_carousels`, `service_tiles`, `promo_grids`, `paragraphs`, `info_boxes`

Pages compose layouts via the `sections` **many-to-any** field. Each section is a reference:

```json
{ "collection": "hero_carousels", "item": "<uuid>", "sort": 1 }
```

The page editor uses **Add Existing** to pick block rows. Edits to a shared block propagate to every page that references it.

Legacy inline `pages.components` JSON is deprecated. Seed `006_migrate_page_sections` converts old JSON to block rows + M2A refs when needed.

**Page preview:** `/pages/:id/preview` renders attached M2A sections only (header/footer come from referenced `site_header` / `site_footer` blocks, not duplicated).

**Sample homepage:** Seed `005_liberty_homepage` populates a Liberty-style homepage with hero carousel, service tiles, promo grid, etc.

### Responsive hero images

`hero_banners` (and similar blocks) use three image fields grouped in the UI:

| Field | Breakpoint |
|-------|------------|
| `image_mobile` | &lt; 640px |
| `image_tablet` | 640px – 1023px |
| `image_web` | ≥ 1024px |

The admin UI renders these as a three-column dropzone via `ResponsiveImageGroupField`.

### Permissions & policies

- **Administrator** role has `admin_access: true` (full bypass).
- **Policies** attach to roles and define per-collection create/read/update/delete rules.
- The admin UI shows a **CRUD matrix** when creating or editing policies.
- System policies are editable; rules round-trip through the matrix UI.

### Translations

Enable via the **translations** field interface on a collection. This creates a `{collection}_translations` junction. Manage languages under **Settings → Translations** (`/settings/translations`).

### Flows / triggers

Automation flows live under **Settings → Triggers** (`/settings/triggers`).

| Route | Purpose |
|-------|---------|
| `/settings/triggers` | List, search, create, activate/deactivate, delete |
| `/settings/triggers/:id` | Visual flow editor (canvas, trigger config, operation inspectors, logs) |

| Trigger type | Entry point |
|--------------|-------------|
| Manual | Admin UI **Run** button or `POST /api/flows/:id/trigger` |
| Webhook | `POST /flows/trigger/:flowId` (see auth below) |
| Schedule | Cron via `node-cron` on backend boot |
| Event Hook | Item create/update/delete on configured collections |
| Another Flow | Invoked by a **Trigger Flow** operation |

#### Visual editor walkthrough

1. Create a flow from **Settings → Triggers → New Flow**, then click **Edit** (or open `/settings/triggers/:id`).
2. Configure the **Trigger** node (left panel when trigger is selected): event collections/scopes, webhook secret, or cron schedule.
3. Add operations from the palette and connect the trigger’s output to your **entry operation**.
4. Chain steps with green **resolve** edges; condition nodes also expose a red **reject** path for waterfall logic.
5. Click an operation to edit its config in the bottom panel (collection pickers, filter rules, templates, JSON payloads).
6. **Save** persists the full graph via `PUT /api/flows/:id/graph`. Use the **Logs** tab to inspect per-step input/output and re-run manual flows.

#### Webhook authentication

For webhook triggers, set a **secret token** in the trigger inspector. Requests must include either:

- Header: `Authorization: Bearer <secret>`
- Query: `?token=<secret>`

#### Environment variables (`FLOW_ENV_*`)

Operations can reference env vars in templates as `{{$env.VAR_NAME}}`. Convention: prefix flow-specific secrets and URLs with `FLOW_ENV_`, for example `FLOW_ENV_WEBHOOK_URL` or `FLOW_ENV_API_KEY`. These are loaded from the backend process environment into the flow data chain at runtime.

#### Template variables

| Variable | Description |
|----------|-------------|
| `{{$trigger.type}}` | Trigger type (`manual`, `event`, `webhook`, …) |
| `{{$trigger.collection}}` | Collection name (event hooks) |
| `{{$trigger.keys}}` | Affected item keys |
| `{{$trigger.payload.*}}` | Trigger payload fields |
| `{{$last}}` / `{{$last.field}}` | Output of the previous operation |
| `{{$env.VAR_NAME}}` | Environment variable (e.g. `FLOW_ENV_*`) |

API: `GET/POST/PATCH/DELETE /api/flows`, `PUT /api/flows/:id/graph`, `GET /api/flows/:id/logs/:logId` (admin only).

### Theming

Five admin themes: `light`, `dark`, `midnight`, `ocean`, `sunset`. Theme choice is stored in localStorage and applied via CSS variables in `admin-ui/src/styles/theme-tokens.css`. Switch themes from the user menu or **Project Settings**.

### Asset gallery & Vite proxy

The admin **Asset Gallery** route is `/assets` (SPA page). File serving uses `/assets/:id` (API).

In local dev, `vite.config.ts` proxies `/assets/*` to the backend **except** the exact `/assets` path (gallery page). In production, the admin is static on Vercel and talks to Railway directly — no conflict.

### Directus schema import

Convert a Directus snapshot to this CMS format:

```bash
npm run schema:convert-directus -w backend -- path/to/snapshot.json
```

Run adapter tests:

```bash
npm run test:directus-adapter -w backend
```

---

## Project structure

```
CMS_PROTOTYPE/
├── admin-ui/                    # React admin dashboard (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── fields/          # Field interface components
│   │   │   ├── data-model/      # Collection/field management UI
│   │   │   └── website/         # Page preview block renderers
│   │   ├── pages/               # Route-level pages
│   │   ├── lib/                 # API client, interface catalog, field utils
│   │   ├── stores/              # Zustand (auth, settings)
│   │   └── styles/              # theme-tokens.css
│   ├── vite.config.ts           # Dev proxy (see Asset gallery note)
│   └── vercel.json
├── backend/
│   ├── src/
│   │   ├── api/                 # Express route handlers
│   │   ├── services/            # Business logic
│   │   │   ├── flows/           # Flow engine
│   │   │   ├── block-collections.service.ts
│   │   │   └── website.service.ts
│   │   ├── db/
│   │   │   ├── migrations/      # Knex migrations (001–022+)
│   │   │   └── seeds/           # Idempotent seed data
│   │   ├── graphql/             # Dynamic GraphQL schema
│   │   └── middleware/          # Auth, admin guard, errors
│   ├── data/cms.db              # SQLite database (gitignored in prod)
│   └── uploads/                 # Local file storage
├── scripts/
│   └── e2e-smoke.mjs            # API smoke tests
├── railway.toml                 # Railway deploy (repo root)
├── nixpacks.toml                # Railway/Nixpacks build config
├── render.yaml                  # Optional Render blueprint (alternative to Railway)
├── docker-compose.yml           # Local Postgres
├── DEPLOYMENT.md                # Vercel + Railway guide
└── package.json                 # Workspace root scripts
```

---

## Database, migrations & seeds

### Commands

```bash
# From repo root
npm run db:setup                              # migrate + seed

# From backend workspace
npm run migrate:latest -w backend             # migrations only
npm run migrate:rollback -w backend           # rollback last batch
npm run seed:run -w backend                   # seeds only
```

### Seeds (run in order)

| Seed | Purpose |
|------|---------|
| `001_admin_user` | Admin role, public role, `admin@example.com` user |
| `002_website_collections` | Pages, site chrome collections |
| `003_sample_website_content` | Basic sample content |
| `004_default_policies` | Default access policies |
| `005_liberty_homepage` | Full Liberty-style homepage demo |
| `006_migrate_page_sections` | Migrate legacy page JSON → M2A sections |
| `007_languages` | Default languages for translations |

Seeds are **idempotent** — safe to re-run.

### Reset local database

```bash
rm backend/data/cms.db
npm run db:setup
```

### PostgreSQL (local)

```bash
docker compose up -d postgres
```

Set in `backend/.env`:

```env
DB_CLIENT=pg
DATABASE_URL=postgresql://cms:cms@localhost:5432/cms
```

---

## Scripts & testing

### Root scripts

| Script | Description |
|--------|-------------|
| `npm run dev:backend` | Start API with hot reload (`tsx watch`) |
| `npm run dev:admin` | Start Vite dev server on port 5173 |
| `npm run db:setup` | Run migrations + seeds |
| `npm run test:e2e:api` | API smoke tests (requires running backend) |

### Backend scripts

| Script | Description |
|--------|-------------|
| `npm run build -w backend` | Compile TypeScript → `dist/` |
| `npm run start:prod -w backend` | Migrate, seed, start (Railway / production) |
| `npm run test:directus-adapter -w backend` | Directus snapshot adapter tests |
| `npm run schema:convert-directus -w backend` | Convert Directus snapshot JSON |

### Smoke test coverage

`scripts/e2e-smoke.mjs` verifies: health, login, collections, pages + sections, hero_banners, site_header nav_links repeater, policies, users, languages, CRUD paragraph, unauthorized rejection.

Optional env overrides:

```bash
API_URL=http://localhost:8055 ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=admin npm run test:e2e:api
```

---

## Admin UI routes

Split-panel **login** at `/login`. All other pages use **AppLayout** (sidebar, top bar, breadcrumbs).

| Section | Route | Description |
|---------|-------|-------------|
| **Dashboard** | `/` | Stats, platform services, quick actions |
| **Content** | `/content` | Collection picker |
| | `/content/:collection` | Item list (search, filter, reorder, bulk delete) |
| | `/content/:collection/:id` | Item editor with field interfaces |
| **Pages** | `/pages` | Website pages dashboard |
| | `/pages/new`, `/pages/:id/edit` | Page builder (M2A sections) |
| | `/pages/:id/preview` | Live page preview |
| **Data Model** | `/settings/data-model` | Collection tree |
| | `/settings/data-model/new` | Deep-link → create collection modal |
| | `/settings/data-model/:collection` | Fields / setup / relations tabs |
| | `…/fields/new` | Interface picker (choose field type) |
| | `…/fields/:field` | Field editor with live preview |
| **Triggers** | `/settings/triggers` | Flow automation |
| **Translations** | `/settings/translations` | Language management |
| **Users** | `/settings/users` | User list + CRUD |
| **Access control** | `/settings/access-control` | Roles & policies (CRUD matrix) |
| **Project** | `/settings/project` | Project name, logo, locale |
| **Assets** | `/assets` | Asset gallery (folders + upload) |
| **History** | `/history` | Activity log |

Auth persists across refresh via httpOnly refresh cookie + boot-time `POST /auth/refresh`.

---

## Field interfaces

Editing is handled by `InterfaceRenderer` and components under `admin-ui/src/components/fields/`. The interface catalog lives in `admin-ui/src/lib/interfaceCatalog.ts`.

| Category | Interfaces |
|----------|------------|
| **Text & numbers** | input, textarea, wysiwyg, markdown, code, slug, tags, seo, number, json |
| **Selection** | toggle, dropdown, radio, checkboxes, checkboxes-tree, slider, color, datetime, repeater, map |
| **Files** | file, file-image, files |
| **Relational** | many-to-one, one-to-many, many-to-many, many-to-any, translations, tree-view |
| **Presentation** | header, divider, notice, buttons |
| **Groups / layout** | group-accordion, group-tabs, group-raw, group-detail |

Readonly display uses `FieldReadonlyDisplay`. Group fields nest via `FieldFormLayout`.

---

## API reference

All JSON responses use `{ data: … }` or `{ errors: […] }` envelope (see `backend/src/core/response.ts`).

### Auth

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/login` | POST | Returns `access_token`; sets `refresh_token` httpOnly cookie |
| `/auth/refresh` | POST | Exchanges refresh cookie for new access token |
| `/auth/logout` | POST | Invalidates session and clears cookie |
| `/users/me` | GET | Current user profile (Bearer token) |

### Users (admin)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/users` | GET | List users |
| `/users` | POST | Create user |
| `/users/:id` | PATCH | Update user |
| `/users/:id` | DELETE | Delete user |

### Collections

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/collections` | GET | Bearer | List collections |
| `/api/collections?include_hidden=true` | GET | Admin | Include hidden/system collections |
| `/api/collections` | POST | Admin | Create collection + SQL table |
| `/api/collections/:name` | GET/PATCH/DELETE | Admin | Get / update / delete collection |
| `/api/collections/:name/translations/setup` | POST | Admin | Create translations junction |

### Fields

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/collections/:name/fields` | GET | Bearer | List fields (`?form_data=` for conditions) |
| `/api/collections/:name/fields/:field` | GET | Bearer | Get single field |
| `/api/collections/:name/fields` | POST | Admin | Add column + field metadata |
| `/api/collections/:name/fields/:field` | PATCH/DELETE | Admin | Update / delete field |

Supported SQL types: `string`, `text`, `integer`, `bigInteger`, `float`, `decimal`, `boolean`, `datetime`, `date`, `json`, `uuid`, `hash`, `time`, `csv`, `binary`

Field metadata includes: `required`, `unique`, `nullable`, `is_indexed`, `searchable`, `conditions`, `validation`, `display`, `display_options`, `group`, `width`, `sort`.

### Items

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/items/:collection` | GET | Bearer | List (filter, sort, search, pagination) |
| `/api/items/:collection/:id` | GET | Bearer | Get single item |
| `/api/items/:collection` | POST | Bearer | Create item |
| `/api/items/:collection/:id` | PATCH/DELETE | Bearer | Update / delete item |
| `/api/items/:collection/reorder` | POST | Admin | Reorder when `sort_field` is set |

Query params: `filter[field][_eq]`, `sort=-date_created,title`, `limit`, `offset`, `fields=id,title`, `search=keyword`, `include_archived=true`

Nested reads: `?fields=author,author.name,tags`

### Relationships

| Interface | Storage | Description |
|-----------|---------|-------------|
| `many-to-one` | FK column (uuid) | Points to related item |
| `one-to-many` | Virtual field | Related items where FK points back |
| `many-to-many` | Junction table | Auto-created; optional `with_sort` |
| `many-to-any` | Polymorphic junction | Related collection + item per row |
| `translations` | `{collection}_translations` | Multi-language copies |

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/relations` | GET | Admin | List relations (`?collection=`) |
| `/api/relations/:id` | GET/DELETE | Admin | Get / delete relation |

### Schema

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/schema/snapshot` | GET | Admin | Export schema metadata |
| `/api/schema/diff` | POST | Admin | Diff snapshot vs live |
| `/api/schema/apply` | POST | Admin | Apply snapshot diff |
| `/api/schema/introspect` | POST | Admin | List unregistered DB tables |

### Permissions

Role-based access on all `/api/items` endpoints via `cms_permissions`.

| Role | Behavior |
|------|----------|
| **Administrator** | Full access (`admin_access: true`) |
| **Public** | Unauthenticated requests (no Bearer token) |
| **Custom roles** | Per-collection CRUD + field/row filters via policies |

Management: `GET/POST/DELETE /api/permissions`, `GET/POST/PATCH/DELETE /api/roles`, `GET/POST/PATCH/DELETE /api/policies`

### Flows

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/flows` | GET/POST | Admin | List / create flows |
| `/api/flows/:id` | GET/PATCH/DELETE | Admin | Manage flow |
| `/flows/trigger/:flowId` | POST | Varies | Webhook trigger |

### GraphQL

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/graphql` | POST | Optional Bearer | Dynamic schema from collections/fields |

GraphiQL in development: `http://localhost:8055/graphql`

```graphql
{
  articles {
    id
    title
    date_created
  }
}
```

### Files

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/files` | POST | Bearer | Upload (multipart field `file`) |
| `/assets/:id` | GET | Public | Serve file; optional image transforms |

Transform params: `width`, `height`, `fit` (`cover`, `contain`, …), `format` (`webp`, `jpeg`, `png`, `avif`)

Example: `/assets/{id}?width=400&height=300&fit=cover&format=webp`

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8055` | HTTP port |
| `NODE_ENV` | `development` | `production` on Railway |
| `DB_CLIENT` | `sqlite3` | `sqlite3` or `pg` |
| `DB_FILE` | `./data/cms.db` | SQLite path (dev) |
| `DATABASE_URL` | — | Postgres connection string (prod) |
| `SECRET_KEY` | — | JWT signing secret (**required**) |
| `ADMIN_UI_URL` | `http://localhost:5173` | CORS origin for admin UI |
| `UPLOAD_DIR` | `./uploads` | File storage directory |
| `ACCESS_TOKEN_TTL` | `15m` | Access token lifetime |
| `REFRESH_TOKEN_TTL` | `7d` | Refresh token lifetime |

See `backend/.env.example` for all options.

### Admin UI (production only)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend URL, e.g. `https://cms-backend-production.up.railway.app` (no trailing slash) |

See `admin-ui/.env.example`. **Do not set locally** — use the Vite proxy instead.

---

## Deployment

Full guide: **[DEPLOYMENT.md](./DEPLOYMENT.md)**

| Part | Platform | Config |
|------|----------|--------|
| Admin UI | [Vercel](https://vercel.com) | Root: `admin-ui`, set `VITE_API_URL` |
| Backend | [Railway](https://railway.com) | Repo root, `npm run build -w backend` |
| Database | [Neon](https://neon.tech) | Free PostgreSQL — paste `DATABASE_URL` into Railway |

1. Create a Neon project and copy the connection string
2. Deploy backend on Railway — set `DATABASE_URL`, add volume at `/data`
3. Deploy admin UI on Vercel — set `VITE_API_URL` to Railway URL
4. Set `ADMIN_UI_URL` on Railway to your Vercel URL → redeploy backend
5. Login: `admin@example.com` / `admin` — change password after first login

---

## Troubleshooting

### Port 5173 already in use

Vite is configured with `strictPort: true`. Stop the other process or change the port in `admin-ui/vite.config.ts`.

### Admin UI shows API errors / CORS

- Local: ensure backend is running on `8055` and `VITE_API_URL` is **unset**
- Production: `VITE_API_URL` on Vercel must match Railway backend URL; `ADMIN_UI_URL` on Railway must exactly match Vercel origin

### `/assets` page shows "Cannot GET /assets"

This happens when the Vite proxy forwards the SPA route to the backend. The fix is in `vite.config.ts` (`bypass` for exact `/assets` path). Ensure you have the latest config.

### Login works but session lost on refresh

Check that cookies are sent (`credentials: true` in axios) and `/auth/refresh` succeeds. In production, both hosts must use HTTPS.

### Empty pages / missing sections after seed

Re-run seeds or restart backend — `website.service.ts` repairs missing field metadata on boot. For a clean slate: delete `backend/data/cms.db` and run `npm run db:setup`.

### Migrations out of sync

```bash
npm run migrate:latest -w backend
```

If developing a fresh clone, always run `npm run db:setup` before starting the backend.

---

## License

Private prototype — not licensed for public distribution unless specified by the repository owner.
