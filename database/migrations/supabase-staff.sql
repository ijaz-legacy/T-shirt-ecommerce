-- =====================================================================
-- IJAZ LEGACY · owner + staff roles
-- Run this once in Supabase → SQL Editor after supabase-admin.sql.
--
-- theijazlegacy@gmail.com is the permanent owner. The owner can add or
-- remove staff from the Admin → Staff tab. Staff can manage products,
-- stickers and orders, but cannot add or remove other staff.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.staff (
  email       text PRIMARY KEY,
  role        text NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'staff')),
  active      boolean NOT NULL DEFAULT true,
  label       text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- Who is asking? Both helpers read auth.jwt(), so they always describe
-- the caller — never a value supplied by the browser.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) = 'theijazlegacy@gmail.com'
$$;

-- SECURITY DEFINER so the lookup is not blocked by the staff table's own
-- row-level security (which would make the policies recurse).
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.is_owner()
      OR EXISTS (
        SELECT 1
        FROM public.staff s
        WHERE lower(s.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
          AND s.active
      )
$$;

REVOKE ALL ON FUNCTION public.is_owner() FROM public;
REVOKE ALL ON FUNCTION public.is_staff() FROM public;
GRANT EXECUTE ON FUNCTION public.is_owner() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff() TO anon, authenticated;

-- ---------------------------------------------------------------------
-- The owner row is the source of truth for ownership, but keep it in the
-- table so the Staff tab can list it. The owner can never be deleted by
-- the app; the policy below still protects the row.
-- ---------------------------------------------------------------------
INSERT INTO public.staff (email, role, label)
  VALUES ('theijazlegacy@gmail.com', 'owner', 'Owner')
  ON CONFLICT (email) DO UPDATE SET role = 'owner', active = true;

-- ---------------------------------------------------------------------
-- Policies on the staff table: owner manages everything, everyone else
-- may only read their own row (that is how the site learns their role).
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "staff owner manage" ON public.staff;
DROP POLICY IF EXISTS "staff self read"    ON public.staff;

CREATE POLICY "staff owner manage" ON public.staff
  FOR ALL
  USING (public.is_owner())
  WITH CHECK (public.is_owner());

CREATE POLICY "staff self read" ON public.staff
  FOR SELECT
  USING (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- ---------------------------------------------------------------------
-- Point every admin policy at public.is_staff() so promoted staff get the
-- same rights as the owner, without touching the SQL again.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "products admin write" ON public.products;
CREATE POLICY "products admin write" ON public.products
  FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "stickers admin write" ON public.stickers;
CREATE POLICY "stickers admin write" ON public.stickers
  FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "client-images admin write" ON storage.objects;
CREATE POLICY "client-images admin write" ON storage.objects
  FOR ALL
  USING (bucket_id = 'client-images' AND public.is_staff())
  WITH CHECK (bucket_id = 'client-images' AND public.is_staff());

DROP POLICY IF EXISTS "orders admin write" ON public.orders;
CREATE POLICY "orders admin write" ON public.orders
  FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "order_items admin write" ON public.order_items;
CREATE POLICY "order_items admin write" ON public.order_items
  FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "order_status_events admin write" ON public.order_status_events;
CREATE POLICY "order_status_events admin write" ON public.order_status_events
  FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- ---------------------------------------------------------------------
-- Verify: should return one owner row.
-- ---------------------------------------------------------------------
-- SELECT email, role, active FROM public.staff ORDER BY role, email;
