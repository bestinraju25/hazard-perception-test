-- RAJU HPT v25 — candidate report download from My HPT Attempts
-- Lets a candidate retrieve the stored attempt details needed to regenerate
-- their complete PDF report. Access is restricted by matching mobile number.
-- Run once in Supabase SQL Editor after the existing HPT migrations.

create or replace function public.hpt_get_candidate_attempts(p_phone text)
returns table(
  id uuid,
  candidate_name text,
  phone text,
  started_at timestamptz,
  completed_at timestamptz,
  total_score integer,
  passed boolean,
  report_data jsonb
)
language sql
security definer
set search_path=public
as $$
  select
    a.id,
    a.candidate_name,
    a.phone,
    a.started_at,
    a.completed_at,
    a.total_score,
    a.passed,
    jsonb_build_object(
      'clip_order', coalesce(a.clip_order, '[]'::jsonb),
      'responses', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'response_no', r.response_no,
            'clip_code', r.clip_code,
            'video_id', r.video_id,
            'click_time_seconds', r.click_time_seconds,
            'hazard_no', r.hazard_no,
            'awarded_marks', r.awarded_marks
          ) order by r.response_no, r.created_at
        )
        from public.hpt_responses r
        where r.attempt_id = a.id
      ), '[]'::jsonb)
    ) as report_data
  from public.hpt_attempts a
  where regexp_replace(coalesce(a.phone,''),'\D','','g') = regexp_replace(coalesce(p_phone,''),'\D','','g')
    and nullif(regexp_replace(coalesce(p_phone,''),'\D','','g'),'') is not null
  order by a.completed_at desc nulls last, a.started_at desc
  limit 50;
$$;

revoke all on function public.hpt_get_candidate_attempts(text) from public;
grant execute on function public.hpt_get_candidate_attempts(text) to anon, authenticated;
