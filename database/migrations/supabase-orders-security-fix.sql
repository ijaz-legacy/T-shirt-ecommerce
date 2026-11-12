-- =====================================================================
-- SECURITY FIX — orders were readable by every anonymous visitor
-- =====================================================================
-- The policy below shipped in supabase-admin.sql:
--
--   CREATE POLICY "orders anon read by number" ON public.orders
--     FOR SELECT USING (auth.uid() IS NULL OR auth.uid() = user_id);
--
-- `auth.uid() IS NULL` is true for anonymous callers, so anyone holding the
-- public anon key (it ships inside the browser bundle) could select EVERY row
-- of public.orders — customer names, phones, full addresses. The intended
-- behaviour was "look up your order by its number", but RLS cannot restrict a
-- query by the URL/body the client sends; a policy is all-or-nothing per row.
--
-- Fix: drop that policy, and expose a narrow SECURITY DEFINER function that
-- returns only the five fields the public Track page needs, for an exact
-- order-number match. Direct SELECT on public.orders stays limited to the
-- order's owner (and staff).
--
-- The function is callable by service_role ONLY. The browser's anon key has no
-- path to orders at all: no SELECT policy and no EXECUTE grant. Visitors reach
-- it through the API (GET /api/orders/track/:orderNumber), which holds the
-- service-role key server-side and throttles lookups.
--
-- Run this in Supabase → SQL Editor. It is idempotent; safe to re-run.
-- =====================================================================

DROP POLICY IF EXISTS "orders anon read by number" ON public.orders;

-- 1) Public order tracking: exact order-number match, minimal columns only.
CREATE OR REPLACE FUNCTION public.track_order(p_order_number text)
RETURNS TABLE (
  id           uuid,
  order_number text,
  status       text,
  created_at   timestamptz,
  total        integer
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT o.id, o.order_number, o.status, o.created_at, o.total
  FROM public.orders o
  WHERE upper(o.order_number) = upper(btrim(p_order_number))
  LIMIT 1;
$$;

-- Server-only: nobody holding the public anon key may execute this.
REVOKE ALL ON FUNCTION public.track_order(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_order(text) TO service_role;

-- 2) Keep owner/staff reads intact. These already exist, but re-assert them in
--    case an earlier run created a permissive variant.
DROP POLICY IF EXISTS "orders user read" ON public.orders;
CREATE POLICY "orders user read" ON public.orders
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================================
-- VERIFY — run these after the migration.
-- =====================================================================

-- a) There must be NO select policy on public.orders that is open to anon:
--    expect only the user-read and staff policies.
SELECT policyname, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'orders'
ORDER BY policyname;

-- b) Confirm only service_role may execute the function: the acl column must
--    show `service_role=X/...` and no `anon=` entry.
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args, p.proacl
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'track_order';

-- c) With the anon key, rpc('track_order', …) must now FAIL with 42501
--    (permission denied) and a select on public.orders must return no rows.
--    Both are expected and correct.

-- c) Optional: audit every table for RLS that is off or wide open.
SELECT c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,
       count(p.policyname) AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policies p ON p.schemaname = 'public' AND p.tablename = c.relname
WHERE n.nspname = 'public' AND c.relkind = 'r'
GROUP BY c.relname, c.relrowsecurity
ORDER BY rls_enabled, table_name;
