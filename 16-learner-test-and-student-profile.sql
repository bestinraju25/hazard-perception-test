-- HPT Online Learner's Mock Test + combined student profile (additive migration)
-- Run this file once in Supabase SQL Editor for project nceufqdvuuztdfyesbxx.
-- Does not delete or rewrite existing HPT attempts / responses.

alter table public.hpt_attempts add column if not exists learner_score integer;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname='hpt_attempts_learner_score_check'
      and conrelid='public.hpt_attempts'::regclass
  ) then
    alter table public.hpt_attempts add constraint hpt_attempts_learner_score_check
      check (learner_score is null or learner_score between 0 and 30);
  end if;
end $$;

-- Replace the HPT history lookup with an access-code-validated version that also returns learner_score.
-- The browser is updated to call this three-argument signature. The older unverified signature is removed.
drop function if exists public.hpt_get_candidate_attempts_by_school(text, uuid);
drop function if exists public.hpt_get_candidate_attempts_by_school(text, uuid, text);
create function public.hpt_get_candidate_attempts_by_school(
  p_phone text,
  p_school_id uuid,
  p_school_access_code text
) returns table(
  id uuid,
  candidate_name text,
  phone text,
  started_at timestamptz,
  completed_at timestamptz,
  total_score integer,
  passed boolean,
  learner_score integer,
  report_data jsonb
)
language plpgsql security definer set search_path=public
as $$
begin
  if not exists (
    select 1 from public.hpt_schools s
    where s.id=p_school_id and s.active=true
      and lower(trim(s.access_code))=lower(trim(coalesce(p_school_access_code,'')))
  ) then
    raise exception 'School access is invalid or disabled.';
  end if;
  if nullif(regexp_replace(coalesce(p_phone,''),'\D','','g'),'') is null then
    raise exception 'A valid mobile number is required.';
  end if;
  return query
  select a.id,a.candidate_name,a.phone,a.started_at,a.completed_at,a.total_score,a.passed,a.learner_score,
    jsonb_build_object('clip_order',coalesce(a.clip_order,'[]'::jsonb),'responses',coalesce((
      select jsonb_agg(jsonb_build_object('response_no',r.response_no,'clip_code',r.clip_code,'video_id',r.video_id,
        'click_time_seconds',r.click_time_seconds,'hazard_no',r.hazard_no,'awarded_marks',r.awarded_marks)
      order by r.response_no,r.created_at) from public.hpt_responses r where r.attempt_id=a.id),'[]'::jsonb))
  from public.hpt_attempts a
  where a.school_id=p_school_id
    and regexp_replace(coalesce(a.phone,''),'\D','','g')=regexp_replace(coalesce(p_phone,''),'\D','','g')
  order by a.completed_at desc nulls last,a.started_at desc
  limit 50;
end;
$$;
revoke all on function public.hpt_get_candidate_attempts_by_school(text,uuid,text) from public;
grant execute on function public.hpt_get_candidate_attempts_by_school(text,uuid,text) to anon, authenticated;

create table if not exists public.hpt_learner_attempts (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.hpt_schools(id) on delete cascade,
  candidate_name text not null,
  phone text not null,
  score integer not null check (score between 0 and 30),
  passed boolean not null,
  language text not null default 'en' check (language in ('en','ml')),
  elapsed_seconds integer not null default 0 check (elapsed_seconds between 0 and 86400),
  answers jsonb not null default '[]'::jsonb check (jsonb_typeof(answers)='array'),
  started_at timestamptz not null default now(),
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists hpt_learner_attempts_school_phone_date_idx
  on public.hpt_learner_attempts(school_id, phone, completed_at desc);
create index if not exists hpt_learner_attempts_phone_idx on public.hpt_learner_attempts(phone);

alter table public.hpt_learner_attempts enable row level security;
revoke all on table public.hpt_learner_attempts from public, anon, authenticated;

-- If the Learner's Mock Test is completed before the first HPT attempt, the later HPT row still receives the student's best learner score.
create or replace function public.hpt_attach_best_learner_score()
returns trigger language plpgsql security definer set search_path=public
as $$
declare learner_best integer;
begin
  if new.school_id is null or nullif(regexp_replace(coalesce(new.phone,''),'\D','','g'),'') is null then
    return new;
  end if;
  select max(l.score) into learner_best from public.hpt_learner_attempts l
   where l.school_id=new.school_id
     and regexp_replace(l.phone,'\D','','g')=regexp_replace(new.phone,'\D','','g');
  if learner_best is not null then new.learner_score:=learner_best; end if;
  return new;
end;
$$;
drop trigger if exists hpt_attach_best_learner_score_trigger on public.hpt_attempts;
create trigger hpt_attach_best_learner_score_trigger
before insert or update of school_id, phone on public.hpt_attempts
for each row execute function public.hpt_attach_best_learner_score();

create or replace function public.hpt_record_learner_attempt(
  p_candidate_name text,
  p_phone text,
  p_school_id uuid,
  p_school_access_code text,
  p_score integer,
  p_passed boolean,
  p_language text default 'en',
  p_elapsed_seconds integer default 0,
  p_answers jsonb default '[]'::jsonb,
  p_started_at timestamptz default now(),
  p_completed_at timestamptz default now()
) returns uuid
language plpgsql security definer set search_path=public
as $$
declare new_id uuid := gen_random_uuid(); best_score integer;
begin
  if nullif(trim(coalesce(p_candidate_name,'')),'') is null then raise exception 'Candidate name is required.'; end if;
  if nullif(regexp_replace(coalesce(p_phone,''),'\D','','g'),'') is null then raise exception 'A valid phone number is required.'; end if;
  if p_score is null or p_score < 0 or p_score > 30 then raise exception 'Learner score must be between 0 and 30.'; end if;
  if coalesce(p_language,'en') not in ('en','ml') then raise exception 'Language must be en or ml.'; end if;
  if jsonb_typeof(coalesce(p_answers,'[]'::jsonb)) <> 'array' then raise exception 'Answer review payload must be an array.'; end if;
  if not exists(select 1 from public.hpt_schools s where s.id=p_school_id and s.active=true
      and lower(trim(s.access_code))=lower(trim(coalesce(p_school_access_code,'')))) then
    raise exception 'School access is invalid or disabled.';
  end if;

  insert into public.hpt_learner_attempts(id,school_id,candidate_name,phone,score,passed,language,elapsed_seconds,answers,started_at,completed_at)
  values(new_id,p_school_id,trim(p_candidate_name),trim(p_phone),p_score,(p_score >= 18),coalesce(p_language,'en'),
    greatest(0,coalesce(p_elapsed_seconds,0)),coalesce(p_answers,'[]'::jsonb),coalesce(p_started_at,now()),coalesce(p_completed_at,now()));

  select max(a.score) into best_score from public.hpt_learner_attempts a
    where a.school_id=p_school_id and regexp_replace(a.phone,'\D','','g')=regexp_replace(p_phone,'\D','','g');
  -- For compatibility with existing HPT score exports, also fill the new learner_score field
  -- on the student's latest HPT row, when an HPT row exists. Learner attempts remain separately tracked.
  update public.hpt_attempts h set learner_score=best_score
  where h.school_id=p_school_id and regexp_replace(h.phone,'\D','','g')=regexp_replace(p_phone,'\D','','g');

  return new_id;
end;
$$;
revoke all on function public.hpt_record_learner_attempt(text,text,uuid,text,integer,boolean,text,integer,jsonb,timestamptz,timestamptz) from public;
grant execute on function public.hpt_record_learner_attempt(text,text,uuid,text,integer,boolean,text,integer,jsonb,timestamptz,timestamptz) to anon, authenticated;

create or replace function public.hpt_get_student_profile_by_school(
  p_phone text,
  p_school_id uuid,
  p_school_access_code text
) returns jsonb
language plpgsql security definer set search_path=public
as $$
declare s public.hpt_schools%rowtype; result jsonb;
begin
  select * into s from public.hpt_schools where id=p_school_id and active=true
    and lower(trim(access_code))=lower(trim(coalesce(p_school_access_code,''))) limit 1;
  if not found then raise exception 'School access is invalid or disabled.'; end if;
  if nullif(regexp_replace(coalesce(p_phone,''),'\D','','g'),'') is null then raise exception 'A valid phone number is required.'; end if;

  select jsonb_build_object(
    'school_id',s.id,
    'school_name',s.school_name,
    'candidate_name',coalesce(
      (select a.candidate_name from public.hpt_attempts a where a.school_id=s.id and regexp_replace(a.phone,'\D','','g')=regexp_replace(p_phone,'\D','','g') order by a.completed_at desc nulls last,a.started_at desc limit 1),
      (select l.candidate_name from public.hpt_learner_attempts l where l.school_id=s.id and regexp_replace(l.phone,'\D','','g')=regexp_replace(p_phone,'\D','','g') order by l.completed_at desc limit 1),
      'Student'),
    'hpt_attempt_count',(select count(*) from public.hpt_attempts a where a.school_id=s.id and a.completed_at is not null and regexp_replace(a.phone,'\D','','g')=regexp_replace(p_phone,'\D','','g')),
    'learner_attempt_count',(select count(*) from public.hpt_learner_attempts l where l.school_id=s.id and regexp_replace(l.phone,'\D','','g')=regexp_replace(p_phone,'\D','','g')),
    'best_hpt_score',(select max(a.total_score) from public.hpt_attempts a where a.school_id=s.id and a.completed_at is not null and regexp_replace(a.phone,'\D','','g')=regexp_replace(p_phone,'\D','','g')),
    'best_learner_score',(select max(l.score) from public.hpt_learner_attempts l where l.school_id=s.id and regexp_replace(l.phone,'\D','','g')=regexp_replace(p_phone,'\D','','g')),
    'learner_attempts',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'candidate_name',x.candidate_name,'score',x.score,'passed',x.passed,'language',x.language,'elapsed_seconds',x.elapsed_seconds,'started_at',x.started_at,'completed_at',x.completed_at) order by x.completed_at desc)
      from (select l.* from public.hpt_learner_attempts l where l.school_id=s.id and regexp_replace(l.phone,'\D','','g')=regexp_replace(p_phone,'\D','','g') order by l.completed_at desc limit 100) x),'[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke all on function public.hpt_get_student_profile_by_school(text,uuid,text) from public;
grant execute on function public.hpt_get_student_profile_by_school(text,uuid,text) to anon, authenticated;

comment on column public.hpt_attempts.learner_score is 'Best Learner Mock Test score out of 30 copied from hpt_learner_attempts for combined legacy student exports; learner attempt history remains in hpt_learner_attempts.';
comment on table public.hpt_learner_attempts is 'School-scoped Learner Mock Test attempts with complete answer review payload; access via school-validated RPCs.';
