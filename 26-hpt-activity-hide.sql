-- HPT V130: allow Provider Admin to remove unwanted/test entries from Today's Activity.
-- This hides activity rows only. It NEVER deletes official attempts, responses, scores or student records.
-- Run once in Supabase SQL Editor for project nceufqdvuuztdfyesbxx.

create table if not exists public.hpt_hidden_exam_activity (
  id uuid primary key default gen_random_uuid(),
  session_id uuid unique,
  attempt_id uuid unique,
  hidden_at timestamptz not null default now(),
  hidden_by uuid references auth.users(id) on delete set null,
  constraint hpt_hidden_exam_activity_target_check check (session_id is not null or attempt_id is not null)
);

alter table public.hpt_hidden_exam_activity enable row level security;
revoke all on public.hpt_hidden_exam_activity from anon, authenticated;
grant select on public.hpt_hidden_exam_activity to authenticated;
drop policy if exists hpt_hidden_exam_activity_provider_read on public.hpt_hidden_exam_activity;
create policy hpt_hidden_exam_activity_provider_read
  on public.hpt_hidden_exam_activity
  for select to authenticated
  using (public.is_admin());

create or replace function public.hpt_hide_exam_activity(
  p_session_id uuid default null,
  p_attempt_id uuid default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only an active Provider Admin can hide daily activity entries.';
  end if;
  if p_session_id is null and p_attempt_id is null then
    raise exception 'An activity session ID or attempt ID is required.';
  end if;
  begin
    insert into public.hpt_hidden_exam_activity(session_id,attempt_id,hidden_by)
    values(p_session_id,p_attempt_id,auth.uid());
  exception when unique_violation then
    -- Repeated clicks are harmless; the activity remains hidden.
    null;
  end;
  return true;
end;
$$;
revoke all on function public.hpt_hide_exam_activity(uuid,uuid) from public;
grant execute on function public.hpt_hide_exam_activity(uuid,uuid) to authenticated;
