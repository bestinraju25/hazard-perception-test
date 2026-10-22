-- RAJU HPT v23 - result saving reliability / 10-mark single-hazard support
-- Run this once in Supabase SQL Editor. Safe to re-run.

-- Older HPT schema constrained individual response marks to 0..5.
-- A clip containing only one official hazard is scored out of 10, so
-- a response can legitimately carry 6..10 marks. The old constraint
-- caused the entire hpt_record_attempt transaction to roll back whenever
-- such a response was saved.
alter table public.hpt_responses
  drop constraint if exists hpt_responses_awarded_marks_check;

alter table public.hpt_responses
  add constraint hpt_responses_awarded_marks_check
  check (awarded_marks between 0 and 10);

-- Recreate the recording RPC so it accepts the full 0..10 response range.
create or replace function public.hpt_record_attempt(
  candidate_name text, phone text, started_at timestamptz, completed_at timestamptz,
  total_score integer, passed boolean, clip_order jsonb, responses jsonb default '[]'::jsonb
) returns uuid
language plpgsql security definer set search_path=public
as $$
declare
  new_id uuid := gen_random_uuid();
  r jsonb;
begin
  if nullif(trim(candidate_name),'') is null then raise exception 'Candidate name is required.'; end if;
  if nullif(trim(phone),'') is null then raise exception 'Phone number is required.'; end if;
  if total_score < 0 or total_score > 100 then raise exception 'Invalid HPT score.'; end if;
  if jsonb_typeof(clip_order) <> 'array' then raise exception 'Invalid clip order.'; end if;

  insert into public.hpt_attempts(id,candidate_name,phone,started_at,completed_at,total_score,passed,clip_order)
  values(new_id,trim(candidate_name),trim(phone),started_at,completed_at,total_score,(total_score >= 60),clip_order);

  if jsonb_typeof(coalesce(responses,'[]'::jsonb)) = 'array' then
    for r in select * from jsonb_array_elements(coalesce(responses,'[]'::jsonb)) loop
      insert into public.hpt_responses(
        attempt_id,video_id,clip_code,response_no,click_time_seconds,hazard_no,awarded_marks
      ) values (
        new_id,
        nullif(r->>'video_id','')::uuid,
        nullif(trim(r->>'clip_code'),'') ,
        greatest(1,coalesce((r->>'response_no')::integer,1)),
        greatest(0,coalesce((r->>'click_time_seconds')::numeric,0)),
        nullif(r->>'hazard_no','')::integer,
        greatest(0,least(10,coalesce((r->>'awarded_marks')::integer,0)))
      );
    end loop;
  end if;

  return new_id;
end;
$$;

revoke all on function public.hpt_record_attempt(text,text,timestamptz,timestamptz,integer,boolean,jsonb,jsonb) from public;
grant execute on function public.hpt_record_attempt(text,text,timestamptz,timestamptz,integer,boolean,jsonb,jsonb) to anon, authenticated;
