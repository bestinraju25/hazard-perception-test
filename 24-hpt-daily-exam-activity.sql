-- HPT v126: provider-controlled Skip Clip setting and daily HPT exam activity.
-- Run once in Supabase SQL Editor for project nceufqdvuuztdfyesbxx.
-- Existing exam/score tables and existing result history are not changed.

-- Provider-wide setting. The public RPC below exposes only allow_skip, never the exam access code.
alter table public.hpt_settings
  add column if not exists allow_skip boolean not null default false;

create or replace function public.get_hpt_public_exam_settings()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'allow_skip', coalesce((select allow_skip from public.hpt_settings where id = 1), false)
  );
$$;
revoke all on function public.get_hpt_public_exam_settings() from public;
grant execute on function public.get_hpt_public_exam_settings() to anon, authenticated;

-- One row for each HPT examination started. This gives provider Admin a same-day
-- activity list, including sessions that were started but never completed.
create table if not exists public.hpt_exam_sessions (
  id uuid primary key default gen_random_uuid(),
  candidate_name text not null,
  phone text not null,
  school_id uuid not null references public.hpt_schools(id) on delete cascade,
  exam_type text not null default 'HPT' check (exam_type = 'HPT'),
  status text not null default 'started' check (status in ('started','completed')),
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  completed_at timestamptz,
  total_score integer check (total_score is null or total_score between 0 and 100),
  attempt_id uuid references public.hpt_attempts(id) on delete set null
);
create index if not exists hpt_exam_sessions_started_idx on public.hpt_exam_sessions(started_at desc);
create index if not exists hpt_exam_sessions_school_started_idx on public.hpt_exam_sessions(school_id, started_at desc);

alter table public.hpt_exam_sessions enable row level security;
revoke all on public.hpt_exam_sessions from anon, authenticated;
grant select on public.hpt_exam_sessions to authenticated;
drop policy if exists hpt_exam_sessions_provider_read on public.hpt_exam_sessions;
create policy hpt_exam_sessions_provider_read
  on public.hpt_exam_sessions
  for select to authenticated
  using (public.is_admin());

create or replace function public.hpt_start_exam_session(
  p_candidate_name text,
  p_phone text,
  p_school_id uuid,
  p_school_access_code text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare new_id uuid := gen_random_uuid();
begin
  if nullif(trim(p_candidate_name),'') is null then raise exception 'Candidate name is required.'; end if;
  if nullif(trim(p_phone),'') is null then raise exception 'Candidate mobile number is required.'; end if;
  if not exists (
    select 1 from public.hpt_schools s
    where s.id=p_school_id and s.active=true
      and lower(trim(s.access_code))=lower(trim(coalesce(p_school_access_code,'')))
  ) then raise exception 'School access is invalid or disabled.'; end if;
  insert into public.hpt_exam_sessions(id,candidate_name,phone,school_id,exam_type,status,started_at,last_seen_at)
  values(new_id,trim(p_candidate_name),trim(p_phone),p_school_id,'HPT','started',now(),now());
  return new_id;
end;
$$;
revoke all on function public.hpt_start_exam_session(text,text,uuid,text) from public;
grant execute on function public.hpt_start_exam_session(text,text,uuid,text) to anon, authenticated;

create or replace function public.hpt_touch_exam_session(
  p_session_id uuid,
  p_school_id uuid,
  p_school_access_code text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare touched integer;
begin
  if not exists (
    select 1 from public.hpt_schools s
    where s.id=p_school_id and s.active=true
      and lower(trim(s.access_code))=lower(trim(coalesce(p_school_access_code,'')))
  ) then return false; end if;
  update public.hpt_exam_sessions
    set last_seen_at=now()
    where id=p_session_id and school_id=p_school_id and status='started';
  get diagnostics touched = row_count;
  return touched=1;
end;
$$;
revoke all on function public.hpt_touch_exam_session(uuid,uuid,text) from public;
grant execute on function public.hpt_touch_exam_session(uuid,uuid,text) to anon, authenticated;

create or replace function public.hpt_complete_exam_session(
  p_session_id uuid,
  p_school_id uuid,
  p_school_access_code text,
  p_attempt_id uuid,
  p_total_score integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare completed integer;
begin
  if p_total_score is null or p_total_score<0 or p_total_score>100 then raise exception 'Invalid HPT score.'; end if;
  if not exists (
    select 1 from public.hpt_schools s
    where s.id=p_school_id and lower(trim(s.access_code))=lower(trim(coalesce(p_school_access_code,'')))
  ) then return false; end if;
  update public.hpt_exam_sessions
    set status='completed', completed_at=now(), last_seen_at=now(), total_score=p_total_score, attempt_id=p_attempt_id
    where id=p_session_id and school_id=p_school_id and status='started';
  get diagnostics completed = row_count;
  return completed=1;
end;
$$;
revoke all on function public.hpt_complete_exam_session(uuid,uuid,text,uuid,integer) from public;
grant execute on function public.hpt_complete_exam_session(uuid,uuid,text,uuid,integer) to anon, authenticated;

comment on table public.hpt_exam_sessions is 'HPT exam start/heartbeat/completion activity for Provider Admin daily monitoring. Student exam results remain in hpt_attempts and hpt_responses.';
comment on column public.hpt_settings.allow_skip is 'Provider-wide setting controlling whether the HPT Skip Clip button is displayed. Defaults to false.';
