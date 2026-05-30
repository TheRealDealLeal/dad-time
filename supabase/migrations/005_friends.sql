-- ─────────────────────────────────────────────
-- 005: Friends table
-- ─────────────────────────────────────────────
-- Directional: one row per friendship direction.
-- user_id follows / friends friend_id.

create table if not exists public.friends (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  friend_id   uuid not null references public.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  constraint friends_unique  unique (user_id, friend_id),
  constraint friends_no_self check  (user_id != friend_id)
);

alter table public.friends enable row level security;

create policy "Users can view their own friends list"
  on public.friends for select
  using (auth.uid() = user_id);

create policy "Users can add friends"
  on public.friends for insert
  with check (auth.uid() = user_id);

create policy "Users can remove friends"
  on public.friends for delete
  using (auth.uid() = user_id);
