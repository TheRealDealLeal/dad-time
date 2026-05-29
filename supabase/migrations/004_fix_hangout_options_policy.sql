-- ─────────────────────────────────────────────
-- 004: Fix BOLA on hangout_options INSERT
-- ─────────────────────────────────────────────
-- The previous policy only checked auth.uid() is not null, allowing any
-- authenticated session (including anonymous) to inject time options into
-- any hangout they don't own. Restrict to the hangout creator only.

drop policy if exists "Authenticated users can add options" on public.hangout_options;

create policy "Creator can add options"
  on public.hangout_options for insert
  with check (
    exists (
      select 1 from public.hangouts
      where id = hangout_id
        and created_by = auth.uid()
    )
  );
