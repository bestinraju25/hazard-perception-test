-- HPT Global Monthly Top Three
-- Public-safe podium across all active participating schools.
-- Uses Asia/Kolkata calendar month, one best attempt per normalized mobile number.
-- Public output masks surnames and never returns phone numbers or attempt IDs.

create or replace function public.hpt_global_monthly_top_three()
returns table(
  display_name text,
  school_name text,
  total_score integer,
  average_reaction_seconds numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with month_window as (
    select
      (date_trunc('month', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata') as month_start,
      ((date_trunc('month', now() at time zone 'Asia/Kolkata') + interval '1 month') at time zone 'Asia/Kolkata') as next_month_start
  ),
  attempt_reaction as (
    select
      a.id as attempt_id,
      a.candidate_name,
      a.phone,
      a.total_score,
      a.completed_at,
      s.school_name,
      coalesce(
        nullif(regexp_replace(coalesce(a.phone,''), '\D','','g'), ''),
        'no-phone:' || a.id::text
      ) as student_key,
      avg(greatest(0::numeric, r.click_time_seconds - h.timestamp_seconds))
        filter (where r.awarded_marks > 0 and h.id is not null) as avg_reaction
    from public.hpt_attempts a
    join public.hpt_schools s on s.id = a.school_id and s.active = true
    cross join month_window mw
    left join public.hpt_responses r on r.attempt_id = a.id
    left join public.hpt_hazards h
      on h.video_id = r.video_id
     and h.hazard_no = r.hazard_no
    where a.completed_at is not null
      and a.completed_at >= mw.month_start
      and a.completed_at < mw.next_month_start
    group by a.id,a.candidate_name,a.phone,a.total_score,a.completed_at,s.school_name
  ),
  best_per_student as (
    select distinct on (student_key)
      case
        when position(' ' in btrim(coalesce(candidate_name,''))) > 0 then
          split_part(btrim(candidate_name),' ',1) || ' ' ||
          upper(left(regexp_replace(btrim(candidate_name), '^.*[[:space:]]+', ''),1)) || '.'
        else nullif(btrim(candidate_name),'')
      end as display_name,
      school_name,
      total_score,
      avg_reaction,
      completed_at
    from attempt_reaction
    order by student_key,total_score desc,avg_reaction asc nulls last,completed_at asc
  )
  select
    coalesce(nullif(display_name,''),'Student') as display_name,
    school_name,
    total_score,
    avg_reaction as average_reaction_seconds
  from best_per_student
  order by total_score desc,avg_reaction asc nulls last,completed_at asc,school_name asc
  limit 3;
$$;

revoke all on function public.hpt_global_monthly_top_three() from public;
grant execute on function public.hpt_global_monthly_top_three() to anon, authenticated;
