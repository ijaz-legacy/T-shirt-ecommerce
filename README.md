# IJAZ LEGACY — Fullstack Tee Store

Printed & custom t-shirt store. **React SPA frontend**, **Express REST API**,
**Supabase Postgres + Storage** for the database.

```
ijaz-store/
├── client/                     Frontend — React 18 + TypeScript + Vite
│   ├── index.html
│   ├── vite.config.ts          Dev server + /api proxy to the backend
│   └── src/
│       ├── pages/              Route-level screens (Shop, Customize, Admin…)
│       ├── components/         UI, tee canvas, 3D viewer, crop modal
│       ├── context/            Auth, Cart, Language providers
│       └── lib/                API client, catalog, transliteration, supabase
│
├── server/                     Backend — Express + TypeScript (ESM)
│   ├── .env.example
│   └── src/
│       ├── index.ts            Bootstrap + graceful shutdown
│       ├── app.ts              Middleware, CORS, route mounting, errors
│       ├── config/env.ts       Every environment variable, validated
│       ├── routes/             URL → controller wiring
│       ├── controllers/        Request validation (zod) + response shaping
│       ├── services/           Business logic + database queries
│       ├── middleware/         Auth guards, uploads, error handling
│       ├── lib/                Supabase clients, HttpError, asyncRoute
│       └── types/              Shared server types
│
├── database/
│   ├── README.md
│   └── migrations/             Run in order in the Supabase SQL editor
│
└── package.json                npm workspaces + dev scripts
```

## 1. Install

```bash
npm install          # installs for client + server from the repo root
```

## 2. Configure

### Frontend — `client/.env`

```bash
cp client/.env.example client/.env
```

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Backend — `server/.env`

```bash
cp server/.env.example server/.env
```

Fill in `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`
(Supabase → Settings → API). The service-role key stays on the server only.

## 3. Create the database

In **Supabase → SQL Editor**, run the files in `database/migrations/` in this
order: `supabase-admin.sql`, `supabase-designs.sql`, `supabase-staff.sql`,
`supabase-seed.sql`. Details in [`database/README.md`](database/README.md).

## 4. Run

```bash
npm run dev          # API on :4000 + frontend on :5173
```

Or separately:

```bash
npm run dev:api      # Express + tsx watch
npm run dev:web      # Vite
```

Vite proxies `/api/*` to `http://localhost:4000`, so the browser talks to one
origin in development and there are no CORS surprises.

## Build & deploy

```bash
npm run build        # client → client/dist (static SPA)
npm run build:api    # server → server/dist (plain Node ESM)
npm start            # node server/dist/index.js
```

The client is a static bundle (`client/dist`) — host it anywhere (InfinityFree,
Netlify, Vercel, nginx). The API is a normal Node process — host it on Render,
Railway, Fly.io or your own VPS, then set `VITE_API_URL` for the client and
`CORS_ORIGINS` for the API to the deployed origins.

## API

Base URL: `http://localhost:4000/api`

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/health` | public | Liveness + database probe |
| GET | `/products` | public | List products (`category`, `featured`, `search`, `limit`) |
| GET | `/products/:slug` | public | Single product |
| POST | `/products` | staff | Create product |
| PATCH | `/products/:slug` | staff | Update product |
| DELETE | `/products/:slug` | staff | Delete product |
| GET | `/stickers` | public | List stickers |
| POST/PATCH/DELETE | `/stickers` | staff | Manage stickers |
| GET | `/orders/track/:orderNumber` | public, throttled | Order status for the Track page — five fields, no customer data |
| GET | `/orders` | auth | Own orders (staff see all) |
| GET | `/orders/:id` | auth | Order + items + status timeline |
| POST | `/orders` | auth | Place an order (server computes totals) |
| PATCH | `/orders/:id/status` | staff | Advance the order status |
| GET | `/designs` | auth | Saved tee designs |
| POST | `/designs` | auth | Save a design |
| DELETE | `/designs/:id` | auth | Delete own design |
| POST | `/uploads` | auth | `multipart/form-data` image → Supabase Storage |

Authentication is a Supabase access token: `Authorization: Bearer <jwt>`.
The server verifies it with the anon key and resolves the caller's role from the
`staff` table.

### Calling it from the frontend

`client/src/lib/api.ts` is the typed client — it attaches the signed-in user's
token automatically:

```ts
import { api } from '../lib/api'

const { products } = await api.get<{ products: Product[] }>('/products')
await api.post('/designs', { name, fit, size, colorId, placements })
```

## Pages

| Page | Route |
|---|---|
| Home | `/` |
| Shop | `/shop` |
| Product | `/product/:slug` |
| Custom studio | `/customize` |
| Cart | `/cart` |
| Checkout | `/checkout` |
| Orders | `/orders` |
| Order detail | `/orders/:id` |
| Track | `/track` |
| Login | `/login` |
| Register | `/register` |
| Admin | `/admin` |
