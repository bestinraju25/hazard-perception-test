-- HPT school lifetime statistics RPC
-- All-time totals (no monthly/date filter). Does not expose candidate names, phones or individual attempt rows.
-- Registered students = distinct normalized mobile numbers, with candidate name/attempt ID fallback.
create or replace function public.hpt_school_lifetime_stats(p_school_access_code text)
returns table(
  school_name text,
  registered_students bigint,
  total_attempts bigint,
  passed_attempts bigint,
  failed_attempts bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with selected_school as (
    select s.id, s.school_name
    from public.hpt_schools s
    where s.active = true
      and lower(trim(s.access_code)) = lower(trim(coalesce(p_school_access_code,'')))
    limit 1
  )
  select
    s.school_name,
    count(distinct coalesce(
      nullif(regexp_replace(coalesce(a.phone,''), '\D','','g'),''),
      nullif(lower(trim(coalesce(a.candidate_name,''))),''),
      a.id::text
    )) filter (where a.id is not null) as registered_students,
    count(a.id) as total_attempts,
    count(a.id) filter (
      where (a.passed is true or a.total_score >= 60)
    ) as passed_attempts,
    count(a.id) filter (
      where not (a.passed is true or a.total_score >= 60)
    ) as failed_attempts
  from selected_school s
  left join public.hpt_attempts a
    on a.school_id = s.id
   and a.completed_at is not null
  group by s.id, s.school_name;
$$;

revoke all on function public.hpt_school_lifetime_stats(text) from public;
grant execute on function public.hpt_school_lifetime_stats(text) to anon, authenticated;
