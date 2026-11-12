CREATE TABLE IF NOT EXISTS public.products (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name_en     text not null default '',
  name_ta     text not null default '',
  desc_en     text not null default '',
  desc_ta     text not null default '',
  price       integer not null default 0,
  image       text not null default '',
  color_en    text not null default '',
  color_ta    text not null default '',
  color_hex   text not null default '#000000',
  category    text not null default 'nature',
  badge       text,
  featured    boolean not null default false,
  sort_order  integer not null default 999,
  stock       integer not null default 25,
  active      boolean not null default true,
  stored_image jsonb,               -- blob fallback: {"bytes":<base64>,"mime":"image/webp","width":..,"height":..}
  updated_at  timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS products_sort_idx ON public.products (active, sort_order, featured);
CREATE INDEX IF NOT EXISTS products_slug_idx ON public.products (slug);

CREATE TABLE IF NOT EXISTS public.stickers (
  id          uuid primary key default gen_random_uuid(),
  name_en     text not null default '',
  name_ta     text not null default '',
  image_url   text not null default '',
  stored_image jsonb,               -- blob fallback for stickers too
  category    text not null default 'medium',   -- small | medium | large
  active      boolean not null default true,
  sort_order  integer not null default 999,
  updated_at  timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS stickers_sort_idx ON public.stickers (active, sort_order);

ALTER TABLE public.products   enable row level security;
ALTER TABLE public.stickers   enable row level security;

-- Allow anon/public readers to see published products + active stickers.
DROP POLICY IF EXISTS "products anon read"   ON public.products;
DROP POLICY IF EXISTS "stickers anon read"   ON public.stickers;

CREATE POLICY "products anon read" ON public.products
  FOR SELECT
  USING (active = true);

CREATE POLICY "stickers anon read" ON public.stickers
  FOR SELECT
  USING (active = true);

-- Admins: owner email(s) and any user whose user_metadata.role = 'staff'.
-- Add extra admin emails here when you need them.
DROP POLICY IF EXISTS "products admin write"  ON public.products;
DROP POLICY IF EXISTS "stickers admin write"  ON public.stickers;

CREATE POLICY "products admin write" ON public.products
  FOR ALL
  USING (
    auth.jwt() ->> 'email' IN ('ijazlegacy@gmail.com', 'theijazlegacy@gmail.com')
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'staff'
  )
  WITH CHECK (
    auth.jwt() ->> 'email' IN ('ijazlegacy@gmail.com', 'theijazlegacy@gmail.com')
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'staff'
  );

CREATE POLICY "stickers admin write" ON public.stickers
  FOR ALL
  USING (
    auth.jwt() ->> 'email' IN ('ijazlegacy@gmail.com', 'theijazlegacy@gmail.com')
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'staff'
  )
  WITH CHECK (
    auth.jwt() ->> 'email' IN ('ijazlegacy@gmail.com', 'theijazlegacy@gmail.com')
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'staff'
  );

-- Storage: put local blob fallbacks somewhere the anon client can fetch,
-- so the shop works even when the `images` storage bucket is locked down.
-- The `client-images` bucket is for uploaded product/sticker images that were
-- uploaded via the Admin tab.
INSERT INTO storage.buckets (id, name, public)
  VALUES ('client-images', 'client-images', true)
  ON CONFLICT (id) DO NOTHING;

UPDATE storage.buckets SET public = TRUE WHERE id = 'client-images';

DROP POLICY IF EXISTS "client-images anon read"  ON storage.objects;
DROP POLICY IF EXISTS "client-images admin write" ON storage.objects;

CREATE POLICY "client-images anon read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'client-images');

CREATE POLICY "client-images admin write" ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'client-images'
    AND (
      auth.jwt() ->> 'email' IN ('ijazlegacy@gmail.com', 'theijazlegacy@gmail.com')
      OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'staff'
    )
  )
  WITH CHECK (
    bucket_id = 'client-images'
    AND (
      auth.jwt() ->> 'email' IN ('ijazlegacy@gmail.com', 'theijazlegacy@gmail.com')
      OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'staff'
    )
  );

-- =====================================================================
-- Orders tables (for customer orders, order items, status timeline)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  user_id      uuid REFERENCES auth.users (id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'placed',
  customer_name text NOT NULL DEFAULT '',
  phone        text NOT NULL DEFAULT '',
  address1     text NOT NULL DEFAULT '',
  address2     text DEFAULT '',
  city         text NOT NULL DEFAULT '',
  state        text NOT NULL DEFAULT '',
  pincode      text NOT NULL DEFAULT '',
  subtotal     integer NOT NULL DEFAULT 0,
  shipping_fee integer NOT NULL DEFAULT 0,
  total        integer NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cod',
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_user_idx ON public.orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_number_idx ON public.orders (order_number);

CREATE TABLE IF NOT EXISTS public.order_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     uuid NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  kind         text NOT NULL DEFAULT 'printed',
  product_slug text,
  name_en      text NOT NULL DEFAULT '',
  name_ta      text NOT NULL DEFAULT '',
  size         text NOT NULL DEFAULT '',
  color_en     text NOT NULL DEFAULT '',
  color_ta     text NOT NULL DEFAULT '',
  image        text,
  custom_config jsonb,
  quantity     integer NOT NULL DEFAULT 1,
  unit_price   integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS order_items_order_idx ON public.order_items (order_id);

CREATE TABLE IF NOT EXISTS public.order_status_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     uuid NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  user_id      uuid REFERENCES auth.users (id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'placed',
  note         text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_status_events_order_idx ON public.order_status_events (order_id, created_at DESC);

-- Row level security
ALTER TABLE public.orders   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_events ENABLE ROW LEVEL SECURITY;

-- Public order tracking.
-- SECURITY NOTE: never expose public.orders itself to anon — a policy such as
--   USING (auth.uid() IS NULL OR auth.uid() = user_id)
-- matches every anonymous caller and leaks the whole table (names, phones,
-- addresses). Instead, anon may only call this narrow function, which returns
-- five columns for an exact order-number match.
DROP POLICY IF EXISTS "orders anon read by number" ON public.orders;

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

-- Server-only. The browser's anon key must not be able to execute this; the
-- API calls it with the service-role key (GET /api/orders/track/:orderNumber).
REVOKE ALL ON FUNCTION public.track_order(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_order(text) TO service_role;

-- Users can read their own orders, items and events
DROP POLICY IF EXISTS "orders user read" ON public.orders;
DROP POLICY IF EXISTS "order_items user read" ON public.order_items;
DROP POLICY IF EXISTS "order_status_events user read" ON public.order_status_events;

CREATE POLICY "orders user read" ON public.orders
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "order_items user read" ON public.order_items
  FOR SELECT
  USING (order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid()));

CREATE POLICY "order_status_events user read" ON public.order_status_events
  FOR SELECT
  USING (order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid()));

-- Customers can create their own order, its items and its status events.
-- Without these, checkout fails with a row-level-security error.
DROP POLICY IF EXISTS "orders user insert" ON public.orders;
DROP POLICY IF EXISTS "order_items user insert" ON public.order_items;
DROP POLICY IF EXISTS "order_status_events user insert" ON public.order_status_events;

CREATE POLICY "orders user insert" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "order_items user insert" ON public.order_items
  FOR INSERT TO authenticated
  WITH CHECK (order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid()));

CREATE POLICY "order_status_events user insert" ON public.order_status_events
  FOR INSERT TO authenticated
  WITH CHECK (order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid()));

-- Admins: owner email(s) and any user whose user_metadata.role = 'staff'.
DROP POLICY IF EXISTS "orders admin write" ON public.orders;
DROP POLICY IF EXISTS "order_items admin write" ON public.order_items;
DROP POLICY IF EXISTS "order_status_events admin write" ON public.order_status_events;

CREATE POLICY "orders admin write" ON public.orders
  FOR ALL
  USING (
    auth.jwt() ->> 'email' IN ('ijazlegacy@gmail.com', 'theijazlegacy@gmail.com')
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'staff'
  )
  WITH CHECK (
    auth.jwt() ->> 'email' IN ('ijazlegacy@gmail.com', 'theijazlegacy@gmail.com')
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'staff'
  );

CREATE POLICY "order_items admin write" ON public.order_items
  FOR ALL
  USING (
    auth.jwt() ->> 'email' IN ('ijazlegacy@gmail.com', 'theijazlegacy@gmail.com')
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'staff'
  )
  WITH CHECK (
    auth.jwt() ->> 'email' IN ('ijazlegacy@gmail.com', 'theijazlegacy@gmail.com')
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'staff'
  );

CREATE POLICY "order_status_events admin write" ON public.order_status_events
  FOR ALL
  USING (
    auth.jwt() ->> 'email' IN ('ijazlegacy@gmail.com', 'theijazlegacy@gmail.com')
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'staff'
  )
  WITH CHECK (
    auth.jwt() ->> 'email' IN ('ijazlegacy@gmail.com', 'theijazlegacy@gmail.com')
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'staff'
  );
