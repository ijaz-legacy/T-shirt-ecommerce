# Database

Supabase (PostgreSQL) schema for IJAZ LEGACY. Run these files in the
**Supabase → SQL Editor**, in this order, on a fresh project.

| # | File | What it creates |
|---|---|---|
| 1 | `migrations/supabase-admin.sql` | `products`, `stickers`, `orders`, `order_items`, `order_status_events`, the `client-images` storage bucket and RLS policies |
| 2 | `migrations/supabase-designs.sql` | `saved_designs` (customer's saved tee designs) + own-row RLS |
| 3 | `migrations/supabase-staff.sql` | `staff` table, `is_staff()` helper and staff write policies for products/stickers/storage |
| 4 | `migrations/supabase-seed.sql` | 8 starter products (images intentionally left blank) |
| 5 | `migrations/supabase-orders-security-fix.sql` | **Required on existing projects.** Drops the `orders anon read by number` policy, which let any anonymous visitor read every order (names, phones, addresses), and replaces it with the narrow `track_order()` function (executable by `service_role` only) |
| 6 | `migrations/supabase-orders-track-server-only.sql` | Delta for databases that already ran step 5 with the earlier `anon` grant — revokes it so only the API can look orders up |
| 7 | `migrations/supabase-rls-policies.sql` | **Consolidated RLS.** Re-asserts every table policy in one place and adds the missing `images` bucket policies (public read, customer writes only inside `uploads/<uid>/`, staff write) |
| 8 | `migrations/supabase-orders-api-only.sql` | **Required on existing projects.** Removes the browser INSERT policies on `orders`/`order_items`/`order_status_events` now that checkout writes through `POST /api/orders`, closing client-side price forgery |

A fresh project gets the safe version already, because `supabase-admin.sql` now
creates `track_order()` instead of the open policy. The fix file is still safe to
run — it is idempotent.

Order writes are API-only (step 8): the checkout page calls `POST /api/orders`,
which verifies the access token and recomputes every price before writing with
the service-role key. The browser has no INSERT grant on the order tables, so a
crafted request cannot forge totals.

All files are idempotent (`IF NOT EXISTS` / `DROP POLICY IF EXISTS`), so they are
safe to re-run.

## Storage buckets

| Bucket | Purpose | Public |
|---|---|---|
| `client-images` | Product/sticker images uploaded from the Admin tab and customer uploads | yes |
| `images` | Product photography, plus customer photo uploads under `uploads/<user-id>/` (owner-scoped writes) | yes |

## Connection

The API server (`server/`) talks to this database through `@supabase/supabase-js`
using `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. Row level security still
applies to the anon-key client used by the browser.
