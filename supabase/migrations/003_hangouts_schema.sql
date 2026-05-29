-- ─────────────────────────────────────────────
-- 003: Hangouts group-scheduling schema
-- ─────────────────────────────────────────────
-- Safe to run on a fresh or existing DB.
-- Uses IF NOT EXISTS / DROP IF EXISTS throughout.

-- ── hangouts ─────────────────────────────────────────────────────────────────

create table if not exists public.hangouts (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null
                        check (char_length(trim(title)) > 0)
                        check (char_length(title) <= 80),
  note                text check (note is null or char_length(note) <= 500),
  location            text check (location is null or char_length(location) <= 120),
  invite_code         text not null,
  created_by          uuid not null references public.users(id) on delete cascade,
  status              text not null default 'planning'
                        check (status in ('planning', 'confirmed')),
  confirmed_option_id uuid,
  created_at          timestamptz not null default now()
);

create unique index if not exists hangouts_invite_code_unique
  on public.hangouts (invite_code);

alter table public.hangouts enable row level security;

drop policy if exists "Anyone can view hangouts"    on public.hangouts;
drop policy if exists "Creator can insert hangouts" on public.hangouts;
drop policy if exists "Creator can update hangouts" on public.hangouts;
drop policy if exists "Creator can delete hangouts" on public.hangouts;

create policy "Anyone can view hangouts"
  on public.hangouts for select using (true);

create policy "Creator can insert hangouts"
  on public.hangouts for insert
  with check (auth.uid() = created_by);

create policy "Creator can update hangouts"
  on public.hangouts for update
  using (auth.uid() = created_by);

create policy "Creator can delete hangouts"
  on public.hangouts for delete
  using (auth.uid() = created_by);


-- ── hangout_options ───────────────────────────────────────────────────────────

create table if not exists public.hangout_options (
  id           uuid primary key default gen_random_uuid(),
  hangout_id   uuid not null references public.hangouts(id) on delete cascade,
  suggested_by uuid references public.users(id) on delete set null,
  starts_at    timestamptz not null,
  ends_at      timestamptz,
  location     text check (location is null or char_length(location) <= 120),
  note         text check (note is null or char_length(note) <= 300),
  created_at   timestamptz not null default now()
);

alter table public.hangout_options enable row level security;

drop policy if exists "Anyone can view options"           on public.hangout_options;
drop policy if exists "Authenticated users can add options" on public.hangout_options;
drop policy if exists "Suggester can delete options"      on public.hangout_options;

create policy "Anyone can view options"
  on public.hangout_options for select using (true);

-- Any authenticated user (not just the creator) can propose a time slot
create policy "Authenticated users can add options"
  on public.hangout_options for insert
  with check (auth.uid() is not null);

create policy "Suggester can delete options"
  on public.hangout_options for delete
  using (auth.uid() = suggested_by);


-- ── option_votes ──────────────────────────────────────────────────────────────

create table if not exists public.option_votes (
  id          uuid primary key default gen_random_uuid(),
  option_id   uuid not null references public.hangout_options(id) on delete cascade,
  user_id     uuid references public.users(id) on delete cascade,
  guest_name  text check (guest_name is null or char_length(trim(guest_name)) > 0),
  value       text not null check (value in ('yes', 'maybe', 'no')),
  updated_at  timestamptz not null default now(),
  -- either user_id or guest_name must be present
  constraint option_votes_identity check (user_id is not null or guest_name is not null)
);

-- Unique per (option, user). PostgreSQL treats NULL != NULL by default, so rows where
-- user_id IS NULL (guest votes) never conflict with each other — multiple guests can vote
-- on the same option while authenticated users are limited to one vote per option.
-- The full (non-partial) index is also required for the upsert onConflict target to work.
create unique index if not exists option_votes_user_option_unique
  on public.option_votes (option_id, user_id);

alter table public.option_votes enable row level security;

drop policy if exists "Anyone can view votes"        on public.option_votes;
drop policy if exists "Users can insert own votes"   on public.option_votes;
drop policy if exists "Users can update own votes"   on public.option_votes;

create policy "Anyone can view votes"
  on public.option_votes for select using (true);

-- Authenticated users insert with their user_id; guests insert with guest_name and no user_id
create policy "Users can insert own votes"
  on public.option_votes for insert
  with check (
    (auth.uid() = user_id and user_id is not null)
    or
    (user_id is null and guest_name is not null and char_length(trim(guest_name)) > 0)
  );

create policy "Users can update own votes"
  on public.option_votes for update
  using (auth.uid() = user_id and user_id is not null);

-- Keep updated_at current on vote changes
create or replace function public.touch_option_vote_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists option_votes_updated_at on public.option_votes;
create trigger option_votes_updated_at
  before update on public.option_votes
  for each row execute procedure public.touch_option_vote_updated_at();


-- ── Deferred FK: hangouts → hangout_options ───────────────────────────────────
-- Add after hangout_options exists to avoid circular dependency at table creation.
-- The ADD COLUMN guard handles the case where the table pre-existed without this column.

alter table public.hangouts
  add column if not exists confirmed_option_id uuid;

alter table public.hangouts
  drop constraint if exists hangouts_confirmed_option_fk;

alter table public.hangouts
  add constraint hangouts_confirmed_option_fk
  foreign key (confirmed_option_id)
  references public.hangout_options(id)
  on delete set null;
