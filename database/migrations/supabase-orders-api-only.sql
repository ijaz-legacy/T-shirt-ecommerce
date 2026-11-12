-- =====================================================================
-- Orders are written by the API only
-- =====================================================================
-- The checkout page used to insert orders, order items and status events
-- straight from the browser with the public anon key. RLS checked ownership
-- (`auth.uid() = user_id`) but could not check the money: a crafted request
-- could insert any `unit_price`, `subtotal` or `total`.
--
-- Checkout now calls POST /api/orders. The API verifies the access token,
-- re-prices printed items from `public.products` and custom tees from their
-- fit and placement scales, then writes with the service-role key.
--
-- These policies therefore go away for good. Reads stay owner/staff scoped.
-- Run this after supabase-rls-policies.sql. Idempotent; safe to re-run.
-- =====================================================================

DROP POLICY IF EXISTS "orders user insert"              ON public.orders;
DROP POLICY IF EXISTS "order_items user insert"         ON public.order_items;
DROP POLICY IF EXISTS "order_status_events user insert" ON public.order_status_events;

-- The service role bypasses RLS, so no policy is needed for the API itself.
-- Anonymous visitors still have no SELECT path to orders; public tracking uses
-- public.track_order(), granted to service_role only.

-- ---------------------------------------------------------------------
-- VERIFY
-- ---------------------------------------------------------------------
-- a) Expect only read/write policies owned by "orders user read",
--    "orders admin write" and their item/event counterparts. No "user insert".
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('orders', 'order_items', 'order_status_events')
ORDER BY tablename, policyname;

-- b) With a customer JWT, this must fail with a row-level-security error:
--    INSERT INTO public.orders (order_number, user_id, total) VALUES ('X', auth.uid(), 1);
--    That failure is the point: totals are decided by the API.
