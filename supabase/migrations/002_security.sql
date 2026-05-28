-- ─────────────────────────────────────────────
-- 002: Security hardening + schema corrections
-- ─────────────────────────────────────────────

-- Add missing note column to events
alter table public.events
  add column if not exists note text;

-- ── Check constraints (enforce at DB level, not just client) ──────────────────

alter table public.events
  add constraint events_title_nonempty  check (char_length(trim(title)) > 0),
  add constraint events_title_length    check (char_length(title) <= 80),
  add constraint events_location_length check (location is null or char_length(location) <= 120),
  add constraint events_note_length     check (note is null or char_length(note) <= 500);

alter table public.rsvps
  -- either user_id or guest_name must be present — not both null
  add constraint rsvps_identity         check (user_id is not null or (guest_name is not null and char_length(trim(guest_name)) > 0)),
  add constraint rsvps_guest_name_length check (guest_name is null or char_length(guest_name) <= 50);

-- ── Filtered unique index for guest RSVPs ────────────────────────────────────
-- Supports proper upsert by event_id+guest_name for unauthenticated users.
-- The original named constraint covers authenticated users (event_id, user_id).
create unique index if not exists rsvps_guest_event_name_unique
  on public.rsvps (event_id, lower(guest_name))
  where user_id is null;

-- ── Fix overly broad guest RSVP policies ─────────────────────────────────────
-- BUG: the original UPDATE policy `using (user_id is null)` allowed any
-- unauthenticated caller to bulk-update ALL guest RSVPs in the database.
-- Fix: remove guest update entirely. Re-submission is handled by insert-on-conflict.

drop policy if exists "Authenticated users can update own RSVP" on public.rsvps;
drop policy if exists "Authenticated users can upsert own RSVP" on public.rsvps;

-- Authenticated users can update only their own RSVP row
create policy "Authenticated users can update own RSVP"
  on public.rsvps for update
  using (auth.uid() = user_id and user_id is not null);

-- Insert: authenticated users insert their own; guests insert with no user_id + a name
drop policy if exists "Authenticated users can insert own RSVP" on public.rsvps;
create policy "Insert own RSVP"
  on public.rsvps for insert
  with check (
    (auth.uid() = user_id and user_id is not null)
    or
    (user_id is null and guest_name is not null and char_length(trim(guest_name)) > 0)
  );
