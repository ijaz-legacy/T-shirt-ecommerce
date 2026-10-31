# IJAZ LEGACY — Vite React Store

Full e-commerce store built with **Vite + React + TypeScript + Supabase**.  
Runs as a **static SPA** — upload the `dist/` folder to InfinityFree.

## Setup

### 1. Add your Supabase credentials

Copy `.env.example` to `.env` and fill in:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Both values are in **Supabase → Settings → API → Project API keys**.

### 2. Create the database tables

In **Supabase → SQL Editor**, run the SQL from the previous session  
(users, products, stickers, orders, order_items, order_status_events).

### 3. Seed products

Run `supabase-seed.sql` in the SQL Editor to add the 8 starter products.

### 4. Upload product images

In **Supabase → Storage**, create a bucket called `images` (public).  
Upload the product images from `public/images/products/` in the Next.js project.

### 5. Build

```bash
npm install
npm run build
```

The `dist/` folder is your deployable site.

### 6. Deploy to InfinityFree

Upload everything inside `dist/` to your InfinityFree `htdocs` folder.  
The `.htaccess` file is already included — it handles SPA routing.

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
