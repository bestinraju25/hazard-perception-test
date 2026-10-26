-- HPT school leaderboard RPC
-- Returns only display name, best score and average reaction time for the supplied active school access code.
-- Candidate phone numbers and individual attempt data are never exposed to the browser.
create or replace function public.hpt_school_top_scorers(p_school_access_code text)
returns table(candidate_name text,total_score integer,average_reaction_seconds numeric)
language sql
stable
security definer
set search_path = public
as $$
  with selected_school as (
    select s.id
    from public.hpt_schools s
    where s.active = true
      and lower(trim(s.access_code)) = lower(trim(coalesce(p_school_access_code,'')))
    limit 1
  ),
  attempt_reaction as (
    select
      a.id as attempt_id,
      a.candidate_name,
      a.phone,
      a.total_score,
      a.completed_at,
      avg(greatest(0, r.click_time_seconds - h.timestamp_seconds))
        filter (where r.awarded_marks > 0 and h.id is not null) as avg_reaction
    from public.hpt_attempts a
    join selected_school s on s.id = a.school_id
    left join public.hpt_responses r on r.attempt_id = a.id
    left join public.hpt_hazards h
      on h.video_id = r.video_id
     and h.hazard_no = r.hazard_no
    where a.completed_at is not null
    group by a.id, a.candidate_name, a.phone, a.total_score, a.completed_at
  ),
  best_per_student as (
    select distinct on (coalesce(nullif(regexp_replace(phone,'\D','','g'),''), lower(trim(candidate_name))))
      candidate_name,total_score,avg_reaction
    from attempt_reaction
    order by
      coalesce(nullif(regexp_replace(phone,'\D','','g'),''), lower(trim(candidate_name))),
      total_score desc,
      avg_reaction asc nulls last,
      completed_at asc
  )
  select candidate_name,total_score,avg_reaction
  from best_per_student
  order by total_score desc,avg_reaction asc nulls last,candidate_name asc
  limit 10;
$$;

revoke all on function public.hpt_school_top_scorers(text) from public;
grant execute on function public.hpt_school_top_scorers(text) to anon, authenticated;
