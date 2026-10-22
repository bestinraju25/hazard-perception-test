-- RAJU HPT v14 candidate history lookup
-- Adds phone-number lookup for a candidate to view their own completed HPT attempts.
-- Defensive Driving Seminar system is untouched.

create or replace function public.hpt_get_candidate_attempts(p_phone text)
returns table(
  id uuid,
  candidate_name text,
  phone text,
  started_at timestamptz,
  completed_at timestamptz,
  total_score integer,
  passed boolean
)
language sql
security definer
set search_path=public
as $$
  select a.id,a.candidate_name,a.phone,a.started_at,a.completed_at,a.total_score,a.passed
  from public.hpt_attempts a
  where regexp_replace(coalesce(a.phone,''),'\D','','g') = regexp_replace(coalesce(p_phone,''),'\D','','g')
    and nullif(regexp_replace(coalesce(p_phone,''),'\D','','g'),'') is not null
  order by a.completed_at desc nulls last, a.started_at desc
  limit 50;
$$;

revoke all on function public.hpt_get_candidate_attempts(text) from public;
grant execute on function public.hpt_get_candidate_attempts(text) to anon, authenticated;
