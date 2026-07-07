# CMS Prototype

A Directus-style headless CMS with a visual admin dashboard and auto-generated REST + GraphQL APIs.

## Tech Stack

- **Backend:** Node.js, TypeScript, Express, Knex (SQLite dev / PostgreSQL prod)
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Zustand

## Quick Start

```bash
# Install dependencies
npm install

# Configure backend environment
cp backend/.env.example backend/.env

# Run migrations and seed admin user
npm run db:setup

# Start backend (port 8055)
npm run dev:backend

# Start admin UI (port 5173) — in a separate terminal
npm run dev:admin
```

## Auth API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/login` | POST | Returns `access_token`; sets `refresh_token` httpOnly cookie |
| `/auth/refresh` | POST | Exchanges refresh cookie for new access token |
| `/auth/logout` | POST | Invalidates session and clears cookie |
| `/users/me` | GET | Current user profile (requires Bearer token) |

## Collections API

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/collections` | GET | Bearer | List all collections |
| `/api/collections?include_hidden=true` | GET | Admin | Include hidden/system collections |
| `/api/collections` | POST | Admin | Create collection + SQL table |
| `/api/collections/:name` | GET | Bearer | Get single collection |
| `/api/collections/:name` | PATCH | Admin | Update collection metadata (icon, archive, sort, singleton) |
| `/api/collections/:name` | DELETE | Admin | Drop table and remove metadata |
| `/api/collections/:name/translations/setup` | POST | Admin | Create translations junction + languages collection |

## Fields API

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/collections/:name/fields` | GET | Bearer | List fields (`?form_data=` for resolved conditions) |
| `/api/collections/:name/fields/:field` | GET | Bearer | Get single field |
| `/api/collections/:name/fields` | POST | Admin | Add column + field metadata |
| `/api/collections/:name/fields/:field` | PATCH | Admin | Update metadata (SQL type cannot change) |
| `/api/collections/:name/fields/:field` | DELETE | Admin | Drop column (system fields protected) |

Supported SQL types: `string`, `text`, `integer`, `bigInteger`, `float`, `decimal`, `boolean`, `datetime`, `date`, `json`, `uuid`, `hash`, `time`, `csv`, `binary`

Field metadata supports `required`, `unique`, `nullable`, `is_indexed`, `searchable`, `conditions`, and `validation` rules.

## Items API

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/items/:collection` | GET | Bearer | List items (filter, sort, search, pagination) |
| `/api/items/:collection/:id` | GET | Bearer | Get single item |
| `/api/items/:collection` | POST | Bearer | Create item |
| `/api/items/:collection/:id` | PATCH | Bearer | Update item |
| `/api/items/:collection/:id` | DELETE | Bearer | Delete item |
| `/api/items/:collection/reorder` | POST | Admin | Reorder items when `sort_field` is configured |

Query params: `filter[field][_eq]`, `sort=-date_created,title`, `limit`, `offset`, `fields=id,title`, `search=keyword`, `include_archived=true`

## Relationships

Create relation fields via the Fields API with these interfaces:

| Interface | Storage | Description |
|-----------|---------|-------------|
| `many-to-one` | FK column (uuid) on current collection | Points to related item |
| `one-to-many` | Virtual field (no column) | Related items where FK points back |
| `many-to-many` | Junction table `{a}_{b}` | Auto-created with two FK columns; optional `with_sort` |
| `many-to-any` | Polymorphic junction `{collection}_m2a` | Related collection + item per row |
| `translations` | `{collection}_translations` junction | Multi-language field copies |

## Relations API

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/relations` | GET | Admin | List relations (`?collection=`) |
| `/api/relations/:id` | GET | Admin | Get relation by ID |
| `/api/relations/:id` | DELETE | Admin | Delete relation metadata |

Relation metadata is stored in `cms_relations`. Nested reads use `?fields=author,author.name,tags`. M2M junction order is preserved when `sort_field` is set on the relation.

## Schema API

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/schema/snapshot` | GET | Admin | Export collections/fields/relations metadata |
| `/api/schema/diff` | POST | Admin | Diff snapshot vs live schema |
| `/api/schema/apply` | POST | Admin | Apply snapshot diff transactionally |
| `/api/schema/introspect` | POST | Admin | List unregistered DB tables; `{ import_tables: [] }` to import |

## Permissions

Role-based access control is enforced on all `/api/items` endpoints via `cms_permissions`.

| Role | Behavior |
|------|----------|
| **Administrator** | Full access (`admin_access: true` bypasses checks) |
| **Public** | Used for unauthenticated requests (no Bearer token) |
| **Custom roles** | Per-collection `create` / `read` / `update` / `delete` rules |

**Permission features:**
- Collection-level action checks (`create`, `read`, `update`, `delete`)
- Field-level read/write via `fields` JSON (`["title"]` or `["*"]`)
- Row-level filters via `permissions.filter` (merged with user query filters)

**Management API (admin only):**
- `GET /api/roles` — list roles
- `GET /api/permissions?role=` — list permissions for a role
- `POST /api/permissions` — create/update a permission rule
- `DELETE /api/permissions/:id` — delete a permission

Unauthenticated `GET /api/items/articles` works if the Public role has `read` on `articles` (seeded by default).

## GraphQL API

Dynamic GraphQL schema is generated from `cms_collections` and `cms_fields` metadata.

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/graphql` | POST | Optional Bearer | Execute GraphQL queries and mutations |

The schema auto-reloads when collections or fields change (fingerprint-based cache).

**Per collection, the schema exposes:**
- `articles` — list query with `filter`, `sort`, `limit`, `offset`, `search`
- `articles_by_id(id: ID!)` — single item query
- `create_articles_item(data: CreateArticleInput!)` — create mutation
- `update_articles_item(id: ID!, data: UpdateArticleInput!)` — update mutation
- `delete_articles_item(id: ID!)` — delete mutation

Nested relation fields (M2O, O2M, M2M) are supported in selection sets. Permissions match the REST Items API (Public role when unauthenticated).

**Example query (no auth — Public read on `articles`):**

```graphql
{
  articles {
    id
    title
    date_created
  }
}
```

GraphiQL is enabled in development at `http://localhost:8055/graphql`.

## Files API

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/files` | POST | Bearer | Upload a file (multipart field `file`) |
| `/assets/:id` | GET | Public | Serve a file by ID |

Uploaded files are stored in `UPLOAD_DIR` (default `./uploads`) with metadata in `cms_files`.

**Image transforms** on `/assets/:id`:

| Query param | Description |
|-------------|-------------|
| `width` | Target width in pixels |
| `height` | Target height in pixels |
| `fit` | `cover`, `contain`, `fill`, `inside`, `outside` (default: `cover`) |
| `format` | `webp`, `jpeg`, `png`, `avif` |

Example: `/assets/{id}?width=400&height=300&fit=cover&format=webp`

## Admin UI

| Page | Route | Description |
|------|-------|-------------|
| Login | `/login` | Email + password authentication |
| Dashboard | `/` | Stats, quick links |
| Content | `/content/:collection` | List, search, sort, archive filter, manual reorder, bulk delete, item editor |
| `/settings/data-model` | Collection card grid, schema export/import/introspect |
| `/settings/data-model/new` | 2-step collection wizard |
| `/settings/data-model/:collection` | Fields tab with drag-reorder field cards |
| `/settings/data-model/:collection/setup` | Icon, color, display template, archive, translations |
| `/settings/data-model/:collection/relations` | Create/edit/delete relations |
| `/settings/data-model/:collection/fields/new` | Visual interface picker |
| `/settings/data-model/:collection/fields/:field` | Field detail (Simple + Advanced tabs, preview) |
| Access Control | `/settings/access-control` | Role permissions grid |
| Settings | `/settings/project` | Project name, logo, language, timezone |

Field editing uses `FieldBuilderDrawer` (schema, interface, layout, display, conditions tabs) and `InterfaceRenderer` for all interface types including file upload, relations (M2O/O2M/M2M), JSON, slug, color, map, divider/notice aliases, and wysiwyg/markdown text areas.

## Default Admin Credentials

- **Email:** admin@example.com
- **Password:** admin

## PostgreSQL (Production)

Start PostgreSQL via Docker:

```bash
docker compose up -d postgres
```

Set `DB_CLIENT=pg` and the PostgreSQL connection variables in `backend/.env`.

## Deploy to Vercel + Render

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for step-by-step instructions:

- **Admin UI** → Vercel (`admin-ui/`, set `VITE_API_URL`)
- **Backend API** → Render (`backend/`, PostgreSQL + `ADMIN_UI_URL`)

Quick summary:

1. Deploy backend on Render using `render.yaml` (or manual setup)
2. Deploy admin UI on Vercel with root directory `admin-ui`
3. Set `VITE_API_URL` on Vercel → your Render backend URL
4. Set `ADMIN_UI_URL` on Render → your Vercel URL, then redeploy backend

## Project Structure

```
├── backend/     # Express API, Knex, migrations
├── admin-ui/    # React admin dashboard
└── docker-compose.yml
```
