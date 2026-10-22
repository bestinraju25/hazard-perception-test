-- RAJU HPT v13 results reliability migration
-- Keeps the Defensive Driving Seminar system untouched.
-- Run this once in Supabase SQL Editor after the existing HPT schema/migrations.

create or replace function public.hpt_record_attempt(
  candidate_name text,
  phone text,
  started_at timestamptz,
  completed_at timestamptz,
  total_score integer,
  passed boolean,
  clip_order jsonb,
  responses jsonb default '[]'::jsonb
) returns uuid
language plpgsql
security definer
set search_path=public
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
      insert into public.hpt_responses(attempt_id,video_id,response_no,click_time_seconds,hazard_no,awarded_marks)
      values(
        new_id,
        nullif(r->>'video_id','')::uuid,
        greatest(1,coalesce((r->>'response_no')::integer,1)),
        greatest(0,coalesce((r->>'click_time_seconds')::numeric,0)),
        nullif(r->>'hazard_no','')::integer,
        greatest(0,least(5,coalesce((r->>'awarded_marks')::integer,0)))
      );
    end loop;
  end if;

  return new_id;
end;
$$;

revoke all on function public.hpt_record_attempt(text,text,timestamptz,timestamptz,integer,boolean,jsonb,jsonb) from public;
grant execute on function public.hpt_record_attempt(text,text,timestamptz,timestamptz,integer,boolean,jsonb,jsonb) to anon, authenticated;

-- Ensure admin result visibility and deletion remain correct.
drop policy if exists hpt_attempts_admin_select on public.hpt_attempts;
create policy hpt_attempts_admin_select on public.hpt_attempts
for select to authenticated using(public.is_admin());

drop policy if exists hpt_attempts_admin_delete on public.hpt_attempts;
create policy hpt_attempts_admin_delete on public.hpt_attempts
for delete to authenticated using(public.is_admin());

create index if not exists hpt_attempts_completed_idx on public.hpt_attempts(completed_at desc);
