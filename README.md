# CMS Prototype

A Directus-style headless CMS with a visual admin dashboard, rich field interfaces, and auto-generated REST + GraphQL APIs.

**Repository:** [github.com/t-sparshkumar/CMS_prototype](https://github.com/t-sparshkumar/CMS_prototype)

## Features

- **Data model** — Collections, fields, relations (M2O, O2M, M2M, M2A, translations), schema export/import, drag-reorder
- **Field interfaces** — 40+ types (input, WYSIWYG, markdown, repeater, SEO, files, relations, groups, presentation fields) with live preview
- **Content editing** — Filter, search, sort, archive, bulk actions, conditional fields, group layouts (accordion/tabs)
- **Access control** — Roles, policies, field-level permissions, row-level filters
- **Assets** — Upload, gallery, image transforms (Sharp)
- **Website module** — Pages with M2A sections, reusable page block collections, site header/footer singletons**APIs** — REST items/collections/fields + dynamic GraphQL schema
- **Admin UI** — CRM-style back-office shell (light sidebar, top bar, breadcrumbs, metric dashboard)



## Tech Stack


| Layer        | Stack                                                           |
| ------------ | --------------------------------------------------------------- |
| **Backend**  | Node.js, TypeScript, Express, Knex, GraphQL Yoga                |
| **Database** | SQLite (dev) / PostgreSQL (prod)                                |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Zustand, React Router |




## Quick Start

```bash
# Install dependencies (monorepo workspaces)
npm install

# Configure backend
cp backend/.env.example backend/.env

# Migrate + seed (admin user, sample collections, permissions)
npm run db:setup

# Terminal 1 — API on http://localhost:8055
npm run dev:backend

# Terminal 2 — Admin UI on http://localhost:5173
npm run dev:admin
```

**Default login (development only):**


| Email               | Password |
| ------------------- | -------- |
| `admin@example.com` | `admin`  |


> Do **not** set `VITE_API_URL` locally — the Vite dev proxy forwards `/api`, `/auth`, `/files`, and `/assets` to the backend.  
> Vite uses `strictPort: true` on **5173**; free that port before starting the admin UI.



### Build

```bash
npm run build -w backend
npm run build -w admin-ui
```



### Health check

```bash
curl http://localhost:8055/server/health
```

---



## Admin UI

Split-panel **login** at `/login` (dark hero + form). All other pages use the shared **AppLayout** shell: light sidebar, top bar, breadcrumbs, and page header.

### Navigation


| Section              | Route                              | Description                                              |
| -------------------- | ---------------------------------- | -------------------------------------------------------- |
| **Dashboard**        | `/`                                | Control center — stats, platform services, quick actions |
| **Content & schema** | `/content`                         | Collection picker (block collections at root)            |
|                      | `/content/:collection`             | Item list (search, filter, reorder, bulk delete)         |
|                      | `/content/:collection/:id`         | Item editor with field interfaces                        |
|                      | `/pages`                           | Website pages dashboard (custom section builder)         |
|                      | `/pages/new`, `/pages/:id/edit`    | Page builder (M2A sections)                              |
| **Data Model**       | `/settings/data-model`             | Collection tree — create folders/collections, expand, reorder |
|                      | `/settings/data-model/new`         | Redirects to Data Model + create modal (deep-link)         |
|                      | `/settings/data-model/:collection` | Fields, setup, relations tabs                            |
|                      | `…/fields/new`, `…/fields/:field`  | Interface picker + field editor with live preview        |
| **People & access**  | `/settings/users`                  | User list                                                |
|                      | `/settings/users/new`              | Create user                                              |
|                      | `/settings/access-control`         | Roles & policies                                         |
| **Project**          | `/settings/project`                | Project name, logo, locale (localStorage)                |
|                      | `/assets`                          | Asset gallery + upload                                   |
|                      | `/history`                         | Activity log                                             |


Auth persists across page refresh via httpOnly refresh cookie + boot-time `/auth/refresh`.

### Folders vs collections

In the admin UI, **`is_group: true`** entities are labeled **Folders** (organize other collections, no items). **`is_group: false`** entities are **Collections** (hold content items). Create flows use modal dialogs with a categorized Material icon picker and color field.


Editing is handled by `InterfaceRenderer` and specialized components under `admin-ui/src/components/fields/`:


| Category       | Interfaces                                                                    |
| -------------- | ----------------------------------------------------------------------------- |
| **Text**       | input, textarea, wysiwyg, markdown, code, slug, tags                          |
| **Structured** | json, repeater, block-editor, seo, map                                        |
| **Selection**  | toggle, dropdown, radio, checkboxes, checkboxes-tree, slider, color, datetime |
| **Files**      | file, file-image, files                                                       |
| **Relations**  | many-to-one, one-to-many, many-to-many, many-to-any, translations, tree-view  |
| **Layout**     | group-accordion, group-tabs, header, divider, notice                          |


Readonly display uses `FieldReadonlyDisplay` (images, colors, labels, formatted dates). Group fields nest via `FieldFormLayout`.

### Page components (Directus-style blocks)

Block types are **real collections** at the **Content root** (e.g. `hero_banners`, `hero_carousels`, `paragraphs`). Authors create reusable block instances there with typed fields.

Pages compose layouts via the `sections` many-to-any field: each section is a reference `{ collection, item, sort }` to an existing block row. The page editor uses **Add Existing** to pick blocks; edits to a shared block propagate to every page that references it.

Legacy inline `pages.components` JSON is deprecated (hidden). Seed `006_migrate_page_sections` converts old JSON to block rows + M2A refs when needed.

---



## Environment variables



### Backend (`backend/.env`)


| Variable       | Default                 | Description                                |
| -------------- | ----------------------- | ------------------------------------------ |
| `PORT`         | `8055`                  | HTTP port                                  |
| `DB_CLIENT`    | `sqlite3`               | `sqlite3` or `pg`                          |
| `DB_FILE`      | `./data/cms.db`         | SQLite path (dev)                          |
| `DATABASE_URL` | —                       | Postgres connection string (prod / Render) |
| `SECRET_KEY`   | —                       | JWT signing secret (**required**)          |
| `ADMIN_UI_URL` | `http://localhost:5173` | CORS origin for admin UI                   |
| `UPLOAD_DIR`   | `./uploads`             | File storage directory                     |


See `backend/.env.example` for all options.

### Admin UI (production only)


| Variable       | Description                                                              |
| -------------- | ------------------------------------------------------------------------ |
| `VITE_API_URL` | Backend URL, e.g. `https://cms-backend.onrender.com` (no trailing slash) |


See `admin-ui/.env.example`.

---



## Deploy to Vercel + Render

Full guide: **[DEPLOYMENT.md](./DEPLOYMENT.md)**


| Part     | Platform                     | Config                                       |
| -------- | ---------------------------- | -------------------------------------------- |
| Admin UI | [Vercel](https://vercel.com) | Root: `admin-ui`, set `VITE_API_URL`         |
| Backend  | [Render](https://render.com) | Root: `backend`, use `render.yaml` blueprint |


1. Deploy backend on Render (Postgres + persistent disk for uploads)
2. Deploy admin UI on Vercel
3. Set `ADMIN_UI_URL` on Render to your Vercel URL → redeploy backend

---



## Auth API


| Endpoint        | Method | Description                                                  |
| --------------- | ------ | ------------------------------------------------------------ |
| `/auth/login`   | POST   | Returns `access_token`; sets `refresh_token` httpOnly cookie |
| `/auth/refresh` | POST   | Exchanges refresh cookie for new access token                |
| `/auth/logout`  | POST   | Invalidates session and clears cookie                        |
| `/users/me`     | GET    | Current user profile (requires Bearer token)                 |


Production cookies use `SameSite=None; Secure` for cross-origin Vercel ↔ Render auth.

---



## Collections API


| Endpoint                                    | Method | Auth   | Description                       |
| ------------------------------------------- | ------ | ------ | --------------------------------- |
| `/api/collections`                          | GET    | Bearer | List all collections              |
| `/api/collections?include_hidden=true`      | GET    | Admin  | Include hidden/system collections |
| `/api/collections`                          | POST   | Admin  | Create collection + SQL table     |
| `/api/collections/:name`                    | GET    | Bearer | Get single collection             |
| `/api/collections/:name`                    | PATCH  | Admin  | Update collection metadata        |
| `/api/collections/:name`                    | DELETE | Admin  | Drop table and remove metadata    |
| `/api/collections/:name/translations/setup` | POST   | Admin  | Create translations junction      |


---



## Fields API


| Endpoint                               | Method | Auth   | Description                                |
| -------------------------------------- | ------ | ------ | ------------------------------------------ |
| `/api/collections/:name/fields`        | GET    | Bearer | List fields (`?form_data=` for conditions) |
| `/api/collections/:name/fields/:field` | GET    | Bearer | Get single field                           |
| `/api/collections/:name/fields`        | POST   | Admin  | Add column + field metadata                |
| `/api/collections/:name/fields/:field` | PATCH  | Admin  | Update metadata                            |
| `/api/collections/:name/fields/:field` | DELETE | Admin  | Drop column                                |


Supported SQL types: `string`, `text`, `integer`, `bigInteger`, `float`, `decimal`, `boolean`, `datetime`, `date`, `json`, `uuid`, `hash`, `time`, `csv`, `binary`

Field metadata: `required`, `unique`, `nullable`, `is_indexed`, `searchable`, `conditions`, `validation`, `display`, `display_options`, `group`, `width`, `sort`.

---



## Items API


| Endpoint                         | Method | Auth   | Description                                   |
| -------------------------------- | ------ | ------ | --------------------------------------------- |
| `/api/items/:collection`         | GET    | Bearer | List items (filter, sort, search, pagination) |
| `/api/items/:collection/:id`     | GET    | Bearer | Get single item                               |
| `/api/items/:collection`         | POST   | Bearer | Create item                                   |
| `/api/items/:collection/:id`     | PATCH  | Bearer | Update item                                   |
| `/api/items/:collection/:id`     | DELETE | Bearer | Delete item                                   |
| `/api/items/:collection/reorder` | POST   | Admin  | Reorder when `sort_field` is set              |


Query params: `filter[field][_eq]`, `sort=-date_created,title`, `limit`, `offset`, `fields=id,title`, `search=keyword`, `include_archived=true`

---



## Relationships


| Interface      | Storage                     | Description                        |
| -------------- | --------------------------- | ---------------------------------- |
| `many-to-one`  | FK column (uuid)            | Points to related item             |
| `one-to-many`  | Virtual field               | Related items where FK points back |
| `many-to-many` | Junction table              | Auto-created; optional `with_sort` |
| `many-to-any`  | Polymorphic junction        | Related collection + item per row  |
| `translations` | `{collection}_translations` | Multi-language copies              |




### Relations API


| Endpoint             | Method | Auth  | Description                     |
| -------------------- | ------ | ----- | ------------------------------- |
| `/api/relations`     | GET    | Admin | List relations (`?collection=`) |
| `/api/relations/:id` | GET    | Admin | Get relation by ID              |
| `/api/relations/:id` | DELETE | Admin | Delete relation metadata        |


Nested reads: `?fields=author,author.name,tags`

---



## Schema API


| Endpoint                 | Method | Auth  | Description                 |
| ------------------------ | ------ | ----- | --------------------------- |
| `/api/schema/snapshot`   | GET    | Admin | Export schema metadata      |
| `/api/schema/diff`       | POST   | Admin | Diff snapshot vs live       |
| `/api/schema/apply`      | POST   | Admin | Apply snapshot diff         |
| `/api/schema/introspect` | POST   | Admin | List unregistered DB tables |


---



## Permissions

Role-based access on all `/api/items` endpoints via `cms_permissions`.


| Role              | Behavior                                   |
| ----------------- | ------------------------------------------ |
| **Administrator** | Full access (`admin_access: true`)         |
| **Public**        | Unauthenticated requests (no Bearer token) |
| **Custom roles**  | Per-collection CRUD + field/row filters    |


Management: `GET/POST/DELETE /api/permissions`, `GET/POST/PATCH/DELETE /api/roles`, `GET/POST/PATCH/DELETE /api/policies`

---



## GraphQL API


| Endpoint   | Method | Auth            | Description                            |
| ---------- | ------ | --------------- | -------------------------------------- |
| `/graphql` | POST   | Optional Bearer | Dynamic schema from collections/fields |


Per collection: list query, `by_id`, create/update/delete mutations. Nested relations supported. Permissions match REST.

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

---



## Files API


| Endpoint      | Method | Auth   | Description                           |
| ------------- | ------ | ------ | ------------------------------------- |
| `/files`      | POST   | Bearer | Upload (multipart field `file`)       |
| `/assets/:id` | GET    | Public | Serve file; optional image transforms |


Transform params: `width`, `height`, `fit` (`cover`, `contain`, …), `format` (`webp`, `jpeg`, `png`, `avif`)

Example: `/assets/{id}?width=400&height=300&fit=cover&format=webp`

---



## PostgreSQL (local)

```bash
docker compose up -d postgres
```

Set in `backend/.env`:

```env
DB_CLIENT=pg
DATABASE_URL=postgresql://cms:cms@localhost:5432/cms
```

---



## Project structure

```
CMS_PROTOTYPE/
├── admin-ui/           # React admin dashboard (Vite)
│   ├── src/
│   │   ├── components/ # AppLayout, InterfaceRenderer, fields/
│   │   ├── pages/      # Dashboard, content, data-model, settings
│   │   └── lib/        # API client, interface catalog, field utils
│   ├── vercel.json
│   └── .env.example
├── backend/            # Express API
│   ├── src/
│   │   ├── api/        # Route handlers
│   │   ├── services/   # Business logic
│   │   ├── db/         # Migrations & seeds
│   │   └── graphql/    # Dynamic schema
│   └── .env.example
├── render.yaml         # Render blueprint (backend + Postgres + disk)
├── DEPLOYMENT.md       # Vercel + Render guide
├── docker-compose.yml  # Local Postgres
└── package.json        # Workspace root scripts
```



## Scripts (root)


| Script                | Description               |
| --------------------- | ------------------------- |
| `npm run dev:backend` | Start API with hot reload |
| `npm run dev:admin`   | Start Vite dev server     |
| `npm run db:setup`    | Run migrations + seeds    |




## License

Private prototype — not licensed for public distribution unless specified by the repository owner.