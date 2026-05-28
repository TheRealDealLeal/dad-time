-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────
create table if not exists public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  avatar_url    text,
  push_token    text,
  created_at    timestamptz default now()
);

alter table public.users enable row level security;

create policy "Users can view own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

-- Auto-create user profile on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────
-- EVENTS
-- ─────────────────────────────────────────────
create table if not exists public.events (
  id           uuid primary key default gen_random_uuid(),
  created_by   uuid not null references public.users(id) on delete cascade,
  title        text not null,
  date         timestamptz not null,
  location     text,
  invite_code  text unique not null default encode(gen_random_bytes(6), 'hex'),
  created_at   timestamptz default now()
);

alter table public.events enable row level security;

-- Anyone can view an event if they have the invite code (used for public RSVP page)
create policy "Public read by invite code"
  on public.events for select
  using (true);

-- Only the creator can insert/update/delete their events
create policy "Creator can insert events"
  on public.events for insert
  with check (auth.uid() = created_by);

create policy "Creator can update events"
  on public.events for update
  using (auth.uid() = created_by);

create policy "Creator can delete events"
  on public.events for delete
  using (auth.uid() = created_by);

-- ─────────────────────────────────────────────
-- RSVPS
-- ─────────────────────────────────────────────
create table if not exists public.rsvps (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events(id) on delete cascade,
  user_id     uuid references public.users(id) on delete cascade,
  guest_name  text,                               -- for web invitees without accounts
  status      text not null check (status in ('yes', 'maybe', 'no')),
  updated_at  timestamptz default now(),
  constraint rsvps_event_user_unique unique nulls not distinct (event_id, user_id, guest_name)
);

alter table public.rsvps enable row level security;

-- Anyone can read RSVPs (needed to show the crew on event + invite pages)
create policy "RSVPs are publicly readable"
  on public.rsvps for select
  using (true);

-- Authenticated users can upsert their own RSVP
create policy "Authenticated users can upsert own RSVP"
  on public.rsvps for insert
  with check (auth.uid() = user_id or user_id is null);

create policy "Authenticated users can update own RSVP"
  on public.rsvps for update
  using (auth.uid() = user_id or user_id is null);

-- Keep updated_at current
create or replace function public.touch_rsvp_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger rsvps_updated_at
  before update on public.rsvps
  for each row execute procedure public.touch_rsvp_updated_at();
