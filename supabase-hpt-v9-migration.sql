-- RAJU HPT v9 migration
-- Adds admin deletion for examination records and keeps video binaries OUT of Supabase.
-- Run after the existing HPT schema. Does not alter Defensive Driving Seminar tables/RPCs.

create or replace function public.is_admin() returns boolean
language sql security definer set search_path=public as $$
  select exists(select 1 from public.admin_users where id=auth.uid() and active=true);
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.hpt_attempts enable row level security;

-- Responses already cascade from hpt_attempts. Admin can delete the parent attempt.
drop policy if exists hpt_attempts_admin_delete on public.hpt_attempts;
create policy hpt_attempts_admin_delete
on public.hpt_attempts for delete to authenticated
using (public.is_admin());

-- Make sure candidate result inserts remain possible while reads/deletes are admin-only.
drop policy if exists hpt_attempts_candidate_insert on public.hpt_attempts;
create policy hpt_attempts_candidate_insert
on public.hpt_attempts for insert
with check (true);

-- Helpful indexes for all-results/search/dashboard queries.
create index if not exists hpt_attempts_candidate_name_idx on public.hpt_attempts(lower(candidate_name));
create index if not exists hpt_attempts_phone_idx on public.hpt_attempts(phone);
create index if not exists hpt_attempts_score_idx on public.hpt_attempts(total_score);

-- Optional: ensure only valid two-hazard clips are selected by the candidate app.
-- The app itself filters active clips to those with two hazard rows.
