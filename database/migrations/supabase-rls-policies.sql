-- =====================================================================
-- IJAZ LEGACY · Row Level Security — consolidated policies
-- =====================================================================
-- Run this in Supabase → SQL Editor after:
--   1. supabase-admin.sql
--   2. supabase-designs.sql
--   3. supabase-staff.sql
--
-- It re-asserts every policy in one place, and adds the policies that were
-- missing entirely: the `images` storage bucket. Customers upload cropped
-- photos from the browser (anon key) to
--   images/uploads/<auth.uid()>/<id>.webp
-- so that bucket needs a public read policy plus owner-scoped write policies.
-- Without them every customer upload fails and the studio silently falls back
-- to keeping the image inside the design as a data URL.
--
-- Every statement is idempotent (IF EXISTS / CREATE OR REPLACE), so it is safe
-- to re-run on a live database.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Role helpers (re-created here so this file can run on its own)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) = 'theijazlegacy@gmail.com'
$$;

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
-- 1. Enable RLS on every application table
-- ---------------------------------------------------------------------
ALTER TABLE public.products            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stickers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_designs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff               ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 2. Catalogue: anyone may read only published rows; staff write.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "products anon read"  ON public.products;
DROP POLICY IF EXISTS "products admin write" ON public.products;

CREATE POLICY "products anon read" ON public.products
  FOR SELECT TO anon, authenticated
  USING (active = true);

CREATE POLICY "products admin write" ON public.products
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "stickers anon read"   ON public.stickers;
DROP POLICY IF EXISTS "stickers admin write" ON public.stickers;

CREATE POLICY "stickers anon read" ON public.stickers
  FOR SELECT TO anon, authenticated
  USING (active = true);

CREATE POLICY "stickers admin write" ON public.stickers
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- ---------------------------------------------------------------------
-- 3. Orders — owner-only reads. There is deliberately NO anon policy:
--    `auth.uid() IS NULL` would match every anonymous visitor and leak
--    names, phones and addresses. Public tracking goes through
--    public.track_order(), which the API server calls with the
--    service-role key only.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "orders anon read by number" ON public.orders;
DROP POLICY IF EXISTS "orders user read"           ON public.orders;
DROP POLICY IF EXISTS "orders user insert"         ON public.orders;
DROP POLICY IF EXISTS "orders admin write"         ON public.orders;

CREATE POLICY "orders user read" ON public.orders
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Deliberately no INSERT policy: browsers must not write orders directly.
-- The API (service role) validates the request and computes totals.

CREATE POLICY "orders admin write" ON public.orders
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Customers may read only the items and timeline events of their own order;
-- all writes go through the API; staff manage all of them.
DROP POLICY IF EXISTS "order_items user read"   ON public.order_items;
DROP POLICY IF EXISTS "order_items user insert" ON public.order_items;
DROP POLICY IF EXISTS "order_items admin write" ON public.order_items;

CREATE POLICY "order_items user read" ON public.order_items
  FOR SELECT TO authenticated
  USING (order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid()));

-- No client INSERT policy: order items are written by the API only.

CREATE POLICY "order_items admin write" ON public.order_items
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "order_status_events user read"   ON public.order_status_events;
DROP POLICY IF EXISTS "order_status_events user insert" ON public.order_status_events;
DROP POLICY IF EXISTS "order_status_events admin write" ON public.order_status_events;

CREATE POLICY "order_status_events user read" ON public.order_status_events
  FOR SELECT TO authenticated
  USING (order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid()));

-- No client INSERT policy: status events are written by the API only.

CREATE POLICY "order_status_events admin write" ON public.order_status_events
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- ---------------------------------------------------------------------
-- 4. Public order tracking stays server-only.
-- ---------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.track_order(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_order(text) TO service_role;

-- ---------------------------------------------------------------------
-- 5. Saved designs — strictly own rows.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "own designs read"   ON public.saved_designs;
DROP POLICY IF EXISTS "own designs insert" ON public.saved_designs;
DROP POLICY IF EXISTS "own designs update" ON public.saved_designs;
DROP POLICY IF EXISTS "own designs delete" ON public.saved_designs;

CREATE POLICY "own designs read" ON public.saved_designs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "own designs insert" ON public.saved_designs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own designs update" ON public.saved_designs
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own designs delete" ON public.saved_designs
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 6. Staff directory — owner manages, everyone reads only their own row
--    (that is how the site learns whether you are staff).
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "staff owner manage" ON public.staff;
DROP POLICY IF EXISTS "staff self read"    ON public.staff;

CREATE POLICY "staff owner manage" ON public.staff
  FOR ALL TO authenticated
  USING (public.is_owner())
  WITH CHECK (public.is_owner());

CREATE POLICY "staff self read" ON public.staff
  FOR SELECT TO authenticated
  USING (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- ---------------------------------------------------------------------
-- 7. Storage buckets
-- ---------------------------------------------------------------------
-- client-images: product/sticker artwork uploaded from Admin.
-- images:        product photography AND customer uploads.
INSERT INTO storage.buckets (id, name, public)
  VALUES ('client-images', 'client-images', true)
  ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
  VALUES ('images', 'images', true)
  ON CONFLICT (id) DO NOTHING;

UPDATE storage.buckets SET public = TRUE WHERE id IN ('client-images', 'images');

-- Reads: both buckets are public assets.
DROP POLICY IF EXISTS "client-images anon read" ON storage.objects;
CREATE POLICY "client-images anon read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'client-images');

DROP POLICY IF EXISTS "images anon read" ON storage.objects;
CREATE POLICY "images anon read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'images');

-- Admin writes to client-images.
DROP POLICY IF EXISTS "client-images admin write" ON storage.objects;
CREATE POLICY "client-images admin write" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'client-images' AND public.is_staff())
  WITH CHECK (bucket_id = 'client-images' AND public.is_staff());

-- Customer writes to images: only inside their own uploads/<uid>/ folder.
-- Paths are uploads/<auth.uid()>/<file>, so foldername()[1] = 'uploads'
-- and foldername()[2] = the uploader's user id.
DROP POLICY IF EXISTS "images owner insert" ON storage.objects;
DROP POLICY IF EXISTS "images owner update" ON storage.objects;
DROP POLICY IF EXISTS "images owner delete" ON storage.objects;
DROP POLICY IF EXISTS "images staff write"  ON storage.objects;

CREATE POLICY "images owner insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] = 'uploads'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "images owner update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] = 'uploads'
    AND (storage.foldername(name))[2] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] = 'uploads'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "images owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] = 'uploads'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Staff may also manage the images bucket (product photography).
CREATE POLICY "images staff write" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'images' AND public.is_staff())
  WITH CHECK (bucket_id = 'images' AND public.is_staff());

-- ---------------------------------------------------------------------
-- VERIFY
-- ---------------------------------------------------------------------

-- a) Every table must have RLS on. Expect rls_enabled = true everywhere
--    and a non-zero policy_count for each table.
SELECT c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,
       count(p.policyname) AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policies p ON p.schemaname = 'public' AND p.tablename = c.relname
WHERE n.nspname = 'public' AND c.relkind = 'r'
GROUP BY c.relname, c.relrowsecurity
ORDER BY rls_enabled, table_name;

-- b) public.orders must NOT be readable by anon, and must have no client
--    INSERT policy. Expect only "orders user read" and "orders admin write".
SELECT policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'orders'
ORDER BY policyname;

-- c) Both buckets and their policies.
SELECT id, name, public FROM storage.buckets WHERE id IN ('client-images', 'images');

SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
  AND policyname IN (
    'client-images anon read', 'client-images admin write',
    'images anon read', 'images owner insert', 'images owner update',
    'images owner delete', 'images staff write'
  )
ORDER BY policyname;

-- d) track_order must be service_role only: no anon= or authenticated= in acl.
SELECT p.proname, p.proacl
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'track_order';
