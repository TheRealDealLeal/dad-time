-- Friends table for Dad Time
-- Stores directional friend relationships with status.
-- Accepted friendships are stored in BOTH directions so each user can
-- query "my friends" with a simple .eq('user_id', me).

create table if not exists public.friends (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  friend_id  uuid not null references public.users(id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  unique (user_id, friend_id)
);

-- Index for incoming request lookups
create index if not exists friends_friend_id_idx on public.friends(friend_id);

-- RLS
alter table public.friends enable row level security;

-- Users can read rows they are a party to (either side)
create policy "friends_select" on public.friends
  for select using (
    auth.uid() = user_id or auth.uid() = friend_id
  );

-- Users can insert a request where they are the sender
create policy "friends_insert" on public.friends
  for insert with check (
    auth.uid() = user_id
  );

-- Users can update a row where they are the receiver (to accept it)
-- OR where they are the sender (to update their own outgoing row)
create policy "friends_update" on public.friends
  for update using (
    auth.uid() = friend_id or auth.uid() = user_id
  );

-- Users can delete rows they are party to (cancel / remove / decline)
create policy "friends_delete" on public.friends
  for delete using (
    auth.uid() = user_id or auth.uid() = friend_id
  );
