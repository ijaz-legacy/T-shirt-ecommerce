-- =====================================================================
-- Make track_order() callable by the API server only
-- =====================================================================
-- Run this if you already ran supabase-orders-security-fix.sql with the earlier
-- `GRANT EXECUTE ... TO anon, authenticated` line. It removes that grant, so the
-- public anon key (which ships inside the browser bundle) can no longer call the
-- function directly. Order tracking now goes through the API:
--
--   GET /api/orders/track/:orderNumber   → service-role client → public.track_order
--
-- Idempotent; safe to re-run. Requires supabase-orders-security-fix.sql (or a
-- fresh supabase-admin.sql) to have created the function first.
-- =====================================================================

REVOKE ALL ON FUNCTION public.track_order(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_order(text) TO service_role;

-- VERIFY — the acl column must list service_role and no anon/authenticated entry.
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args, p.proacl
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'track_order';

-- With the anon key, rpc('track_order', …) must now fail with 42501
-- (permission denied) and a select on public.orders must return no rows.
-- Both are expected: the API is the only door now.
