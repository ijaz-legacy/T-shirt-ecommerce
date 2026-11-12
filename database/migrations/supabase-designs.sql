-- =====================================================================
-- Saved custom designs ("Your designs" in the custom studio)
-- Run this once in Supabase → SQL Editor → New query → Run.
-- =====================================================================

create table if not exists public.saved_designs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null default 'Untitled design',
  fit         text not null,
  size        text not null,
  color_id    text not null,
  placements  jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists saved_designs_user_idx
  on public.saved_designs (user_id, created_at desc);

-- Row level security: a user can only touch their own designs.
alter table public.saved_designs enable row level security;

drop policy if exists "own designs read"   on public.saved_designs;
drop policy if exists "own designs insert" on public.saved_designs;
drop policy if exists "own designs update" on public.saved_designs;
drop policy if exists "own designs delete" on public.saved_designs;

create policy "own designs read"
  on public.saved_designs for select
  using (auth.uid() = user_id);

create policy "own designs insert"
  on public.saved_designs for insert
  with check (auth.uid() = user_id);

create policy "own designs update"
  on public.saved_designs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own designs delete"
  on public.saved_designs for delete
  using (auth.uid() = user_id);
