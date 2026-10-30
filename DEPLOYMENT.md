# Deploy IJAZ LEGACY for free: Netlify + Turso

This app is a single full-stack Next.js application. It cannot run on InfinityFree
because InfinityFree only hosts PHP/MySQL. The free stack used here is:

- **Netlify** — hosts the Next.js site and server functions. The free plan allows
  commercial use within its usage limits.
- **Turso** — hosts the SQLite-compatible database used by the store. The free
  plan is sufficient for a small store.

Product images are stored in the database as compressed WebP blobs, so there is no
separate file-storage service to configure.

## Two builds live in this repository

| Build | Folder | Host | Needs |
| --- | --- | --- | --- |
| **PHP + MySQL** | `htdocs/` | InfinityFree (`htdocs`) | PHP 8, MySQL |
| Next.js | `src/` | Netlify, Vercel, any Node host | Node 22, Turso |

The **PHP build is the one for InfinityFree**. Upload the contents of `htdocs/`
to your `htdocs` folder and follow **[htdocs/README.md](htdocs/README.md)** — that
file covers the database, the installer, and every page.

Why a separate build exists: InfinityFree hosts **PHP and static files only**. It
has no Node.js runtime, so it cannot execute a Next.js app. Dropping the Next.js
build output into `htdocs` does not work, because the store is not a static site —
it has 19 API routes, server-rendered pages, session middleware, `sharp` for image
resizing, and a libSQL client. Next.js `output: "export"` is not an escape hatch
either: it refuses to build a project containing API routes or dynamic pages.

The rest of this document describes the **Next.js** deployment, which you do not
need if you are deploying to InfinityFree.

## 1. Create the Turso database

1. Sign in at [app.turso.tech](https://app.turso.tech).
2. Create a database named `ijaz-legacy` in the region closest to your customers
   (for Tamil Nadu, choose the India or Singapore region if available).
3. Copy the database URL. It starts with `libsql://`.
4. Create an auth token for the database and copy it. Treat it like a password.

You need both values:

| Variable | Example | Secret |
| --- | --- | --- |
| `TURSO_DATABASE_URL` | `libsql://ijaz-legacy-xxxx.turso.io` | No |
| `TURSO_AUTH_TOKEN` | long token string | **Yes** |

## 2. Configure local development

Create `.env.local` in the project root:

```env
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-token
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Then run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. On the first request the app creates its tables and
seeds the eight starter products automatically.

Without `TURSO_DATABASE_URL`, the app uses a local file at `data/ijaz-legacy.db`.
This is convenient for offline development but does not persist on Netlify.

## 3. Create the retailer admin account

The store has no default admin password. Create your own account while
`.env.local` still points at Turso:

```bash
npm run create-admin -- you@example.com "YourStrongPass123" "Your Name"
```

Password rules: 8-72 characters with at least one letter and one number.

The script loads `.env.local` automatically. If an account with that email already
exists, it is promoted to admin and its password is left unchanged.

## 4. Push the project to GitHub

The store currently lives inside the larger `D:/IJAZ` repository, so do **not** run
`git add .` from that parent folder — it would include unrelated projects.

Create a separate GitHub repository for the store, then initialize this folder as
its own repository:

1. On GitHub, create an empty repository named `ijaz-legacy-store` (private is fine).
2. From the project folder, run:

```bash
cd "D:/IJAZ/projects/personal website/Tshirt-ecommerce"
git init
git add .
git commit -m "IJAZ LEGACY storefront"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/ijaz-legacy-store.git
git push -u origin main
```

If you use the GitHub CLI instead, this single command creates the repository and
pushes the folder:

```bash
gh repo create ijaz-legacy-store --private --source=. --remote=origin --push
```

Do not commit `.env.local`; it is already ignored.

## 5. Deploy on Netlify

1. Sign in at [app.netlify.com](https://app.netlify.com).
2. Choose **Add new site → Import an existing project**.
3. Connect GitHub and select this repository.
4. Netlify reads `netlify.toml` automatically:
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Node version: 22
5. Before the first deploy, open **Site configuration → Environment variables**
   and add:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN` (mark it as a secret)
   - `NEXT_PUBLIC_SITE_URL` — your deployed address after the first deploy,
     for example `https://your-site.netlify.app` or your custom domain
6. Apply the variables to **all deploy contexts** (production, deploy previews,
   branch deploys).
7. Deploy the site.

Netlify installs its Next.js runtime automatically; you do not need to add a
plugin.

If you later add a custom domain, change `NEXT_PUBLIC_SITE_URL` to that domain and
redeploy so Open Graph metadata uses the correct address.

## 6. Verify the deployment

Replace `https://your-site.netlify.app` with your real deployed URL.

```bash
curl https://your-site.netlify.app/api/health
```

Expected response:

```json
{"status":"ok"}
```

Then check in a browser:

1. The home page, shop, and product pages show the eight seeded products.
2. Register a customer account and sign in.
3. Place a Cash on Delivery order from the cart or a custom tee.
4. Open **Track order**, enter the order number, and confirm the timeline.
5. Sign in with the admin account from step 3.
6. Open `/admin`, update an order status, and edit a product.
7. Upload a product image and confirm it appears on the storefront.
8. Open the site at a narrow width (around 390px) and confirm there is no
   horizontal scrolling.

The admin area and tracking page are excluded from search engines.

## 7. Day-to-day retailer workflow

- **Dashboard** — `/admin`: open orders, last-24-hour orders, delivered revenue,
  low-stock products.
- **Orders** — `/admin/orders`: filter by status, open an order, move it through
  `placed → processing → shipped → delivered`, or cancel it. Cancelling a printed
  order restores its stock.
- **Products** — `/admin/products`: create, edit, deactivate, and re-stock tees.
  Uploaded images are resized and compressed automatically.
- **Storefront** — `/shop` shows only active products; sold-out products stay
  visible but cannot be added to the cart.

## 8. Backups

The database contains products, orders, customers, sessions, and uploaded images.
Back it up regularly and keep a copy outside Turso.

With the Turso CLI installed:

```bash
turso db shell ijaz-legacy .dump > ijaz-legacy-backup.sql
```

You can also use the backup/export option in the Turso dashboard. Before making
large product changes, take a fresh export.

## 9. Free-plan limits and operational notes

- Netlify free includes a monthly build/bandwidth allowance. Check the current
  [Netlify pricing](https://www.netlify.com/pricing/) before a large campaign.
- Turso free includes a monthly read/write allowance and database storage. Check
  the current [Turso usage and billing documentation](https://docs.turso.tech/help/usage-and-billing).
- Netlify server functions can cold start. The first request after inactivity may
  take a little longer.
- Rate limiting is kept in memory per serverless instance. It slows down repeated
  login, registration, order, and admin requests, but it is not a shared global
  quota. For a high-traffic launch, add a durable rate limiter or a WAF at the
  edge.
- The Turso auth token is server-only. Never expose it with a `NEXT_PUBLIC_`
  prefix.
- All payments are Cash on Delivery; no card data is collected or stored.

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `/api/health` returns 503 | Wrong Turso URL or token | Re-copy both values into Netlify and redeploy |
| `URL_SCHEME_NOT_SUPPORTED` | URL is not `libsql://` or `https://` | Use the exact URL from the Turso dashboard |
| Shop is empty | First seed failed or products are inactive | Check Netlify function logs; open `/admin/products` |
| Admin pages return 404 | Signed-in account is not an admin | Run `npm run create-admin` for that email |
| Image upload fails | File is larger than 6 MB or not JPEG/PNG/WebP/AVIF | Resize or convert the image and retry |
| Login works locally but not on Netlify | Missing environment variables | Add them to all deploy contexts and redeploy |
| Metadata shows the wrong domain | `NEXT_PUBLIC_SITE_URL` is unset | Set it and trigger a new deploy |

Official references:

- [Next.js on Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/)
- [Turso documentation](https://docs.turso.tech/)
- [libSQL client documentation](https://docs.turso.tech/sdk/ts/quickstart)
