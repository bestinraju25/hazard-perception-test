-- HPT School Dashboard Statistics RPC — lifetime totals plus a current-month indicator.
-- Main totals are lifetime totals; attempts_this_month is an additional contextual metric.
-- Returns aggregate metrics only for the active school that matches the submitted access code.
create or replace function public.hpt_school_dashboard_stats(p_school_access_code text)
returns table(
  school_name text,
  registered_students bigint,
  total_attempts bigint,
  passed_attempts bigint,
  failed_attempts bigint,
  average_score numeric,
  attempts_this_month bigint
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
  ),
  school_attempts as (
    select a.*
    from public.hpt_attempts a
    join selected_school s on s.id=a.school_id
    where a.completed_at is not null
  ),
  month_window as (
    select (date_trunc('month', now() at time zone 'Asia/Kolkata')
      at time zone 'Asia/Kolkata') as month_start
  )
  select
    s.school_name,
    count(distinct coalesce(
      nullif(regexp_replace(coalesce(a.phone,''), '\D','','g'),''),
      nullif(lower(trim(coalesce(a.candidate_name,''))),''),
      a.id::text
    )) filter (where a.id is not null) as registered_students,
    count(a.id) as total_attempts,
    count(a.id) filter (where a.passed is true or a.total_score >= 60) as passed_attempts,
    count(a.id) filter (where not (a.passed is true or a.total_score >= 60)) as failed_attempts,
    coalesce(round(avg(a.total_score)::numeric,1),0) as average_score,
    count(a.id) filter (where a.completed_at >= mw.month_start) as attempts_this_month
  from selected_school s
  cross join month_window mw
  left join school_attempts a on true
  group by s.id,s.school_name;
$$;

revoke all on function public.hpt_school_dashboard_stats(text) from public;
grant execute on function public.hpt_school_dashboard_stats(text) to anon, authenticated;
