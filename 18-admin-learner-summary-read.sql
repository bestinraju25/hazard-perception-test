-- V110: Provider admin read access to the Learners Mock Test aggregate summary.
-- Run once in Supabase SQL Editor. Does not change stored data or expose the table directly.
create or replace function public.hpt_admin_list_learner_summaries()
returns table (
  school_id uuid,
  phone_normalized text,
  candidate_name text,
  attempt_count integer,
  best_score integer,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.admin_users a
    where a.id = auth.uid() and a.active = true
  ) then
    raise exception 'Not authorised to view provider learner summaries.';
  end if;

  return query
    select s.school_id, s.phone_normalized, s.candidate_name,
           s.attempt_count, s.best_score, s.updated_at
    from public.hpt_learner_student_summary s
    order by s.updated_at desc;
end;
$$;
revoke all on function public.hpt_admin_list_learner_summaries() from public, anon;
grant execute on function public.hpt_admin_list_learner_summaries() to authenticated;
