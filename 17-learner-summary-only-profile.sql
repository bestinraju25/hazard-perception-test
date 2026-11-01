-- V105: Student Profile stores only lifetime attempt counts and highest scores.
-- Run after 16-learner-test-and-student-profile.sql.
-- Learner attempt-level answer/date/history rows are first consolidated, then dropped.
-- HPT attempt rows are intentionally retained for existing HPT reports, certificates,
-- provider analytics and other existing HPT workflows; the Student Profile no longer displays them.

create table if not exists public.hpt_learner_student_summary (
  school_id uuid not null references public.hpt_schools(id) on delete cascade,
  phone_normalized text not null,
  candidate_name text not null default 'Student',
  attempt_count integer not null default 0 check (attempt_count >= 0),
  best_score integer check (best_score is null or best_score between 0 and 30),
  updated_at timestamptz not null default now(),
  primary key (school_id, phone_normalized)
);
alter table public.hpt_learner_student_summary enable row level security;
revoke all on table public.hpt_learner_student_summary from public, anon, authenticated;

-- Preserve existing lifetime counts and best scores, without preserving individual attempts.
do $$
begin
  if to_regclass('public.hpt_learner_attempts') is not null then
    execute $migrate$
      insert into public.hpt_learner_student_summary
        (school_id,phone_normalized,candidate_name,attempt_count,best_score,updated_at)
      select school_id,regexp_replace(coalesce(phone,''),'\D','','g'),
        (array_agg(candidate_name order by completed_at desc))[1],count(*)::integer,max(score),now()
      from public.hpt_learner_attempts
      where nullif(regexp_replace(coalesce(phone,''),'\D','','g'),'') is not null
      group by school_id,regexp_replace(coalesce(phone,''),'\D','','g')
      on conflict (school_id,phone_normalized) do update set
        candidate_name=excluded.candidate_name,
        attempt_count=greatest(public.hpt_learner_student_summary.attempt_count,excluded.attempt_count),
        best_score=case when public.hpt_learner_student_summary.best_score is null then excluded.best_score
                        when excluded.best_score is null then public.hpt_learner_student_summary.best_score
                        else greatest(public.hpt_learner_student_summary.best_score,excluded.best_score) end,
        updated_at=now()
    $migrate$;
  end if;
end $$;

-- Remove the old per-attempt table and functions that read from it.
drop trigger if exists hpt_attach_best_learner_score_trigger on public.hpt_attempts;
drop function if exists public.hpt_attach_best_learner_score();
drop function if exists public.hpt_get_student_profile_by_school(text,uuid,text);
drop function if exists public.hpt_record_learner_attempt(text,text,uuid,text,integer,boolean,text,integer,jsonb,timestamptz,timestamptz);
drop table if exists public.hpt_learner_attempts;

-- Keep the historic HPT rows intact, but copy the learner's aggregate best score into the
-- existing compatibility column so existing exports that select learner_score keep working.
update public.hpt_attempts h
set learner_score=s.best_score
from public.hpt_learner_student_summary s
where h.school_id=s.school_id
  and regexp_replace(coalesce(h.phone,''),'\D','','g')=s.phone_normalized;

create or replace function public.hpt_attach_best_learner_score()
returns trigger language plpgsql security definer set search_path=public
as $$
declare learner_best integer; normalized_phone text;
begin
  normalized_phone:=regexp_replace(coalesce(new.phone,''),'\D','','g');
  if new.school_id is null or normalized_phone='' then return new; end if;
  select best_score into learner_best
  from public.hpt_learner_student_summary
  where school_id=new.school_id and phone_normalized=normalized_phone;
  if learner_best is not null then new.learner_score:=learner_best; end if;
  return new;
end;
$$;
create trigger hpt_attach_best_learner_score_trigger
before insert or update of school_id,phone on public.hpt_attempts
for each row execute function public.hpt_attach_best_learner_score();

-- Same RPC name/arguments for front-end compatibility. p_answers and per-attempt timestamps
-- are accepted but deliberately NOT stored. Only count + best score are retained.
create function public.hpt_record_learner_attempt(
  p_candidate_name text,
  p_phone text,
  p_school_id uuid,
  p_school_access_code text,
  p_score integer,
  p_passed boolean default false,
  p_language text default 'en',
  p_elapsed_seconds integer default 0,
  p_answers jsonb default '[]'::jsonb,
  p_started_at timestamptz default now(),
  p_completed_at timestamptz default now()
) returns jsonb
language plpgsql security definer set search_path=public
as $$
declare normalized_phone text; summary_row public.hpt_learner_student_summary%rowtype;
begin
  if nullif(trim(coalesce(p_candidate_name,'')),'') is null then raise exception 'Candidate name is required.'; end if;
  normalized_phone:=regexp_replace(coalesce(p_phone,''),'\D','','g');
  if normalized_phone='' then raise exception 'A valid phone number is required.'; end if;
  if p_score is null or p_score<0 or p_score>30 then raise exception 'Learner score must be between 0 and 30.'; end if;
  if coalesce(p_language,'en') not in ('en','ml') then raise exception 'Language must be en or ml.'; end if;
  if not exists(select 1 from public.hpt_schools s where s.id=p_school_id and s.active=true
    and lower(trim(s.access_code))=lower(trim(coalesce(p_school_access_code,'')))) then
    raise exception 'School access is invalid or disabled.';
  end if;

  insert into public.hpt_learner_student_summary(school_id,phone_normalized,candidate_name,attempt_count,best_score,updated_at)
  values(p_school_id,normalized_phone,trim(p_candidate_name),1,p_score,coalesce(p_completed_at,now()))
  on conflict(school_id,phone_normalized) do update set
    candidate_name=excluded.candidate_name,
    attempt_count=public.hpt_learner_student_summary.attempt_count+1,
    best_score=case when public.hpt_learner_student_summary.best_score is null then excluded.best_score
                    else greatest(public.hpt_learner_student_summary.best_score,excluded.best_score) end,
    updated_at=excluded.updated_at
  returning * into summary_row;

  update public.hpt_attempts h set learner_score=summary_row.best_score
  where h.school_id=p_school_id and regexp_replace(coalesce(h.phone,''),'\D','','g')=normalized_phone;

  return jsonb_build_object('attempt_count',summary_row.attempt_count,'best_score',summary_row.best_score,'passed',summary_row.best_score>=18);
end;
$$;
revoke all on function public.hpt_record_learner_attempt(text,text,uuid,text,integer,boolean,text,integer,jsonb,timestamptz,timestamptz) from public;
grant execute on function public.hpt_record_learner_attempt(text,text,uuid,text,integer,boolean,text,integer,jsonb,timestamptz,timestamptz) to anon,authenticated;

create function public.hpt_get_student_profile_by_school(
  p_phone text,p_school_id uuid,p_school_access_code text
) returns jsonb
language plpgsql security definer set search_path=public
as $$
declare school_row public.hpt_schools%rowtype; normalized_phone text; result jsonb;
begin
  select * into school_row from public.hpt_schools
  where id=p_school_id and active=true
    and lower(trim(access_code))=lower(trim(coalesce(p_school_access_code,''))) limit 1;
  if not found then raise exception 'School access is invalid or disabled.'; end if;
  normalized_phone:=regexp_replace(coalesce(p_phone,''),'\D','','g');
  if normalized_phone='' then raise exception 'A valid phone number is required.'; end if;
  if not exists(select 1 from public.hpt_attempts a where a.school_id=school_row.id and a.completed_at is not null and regexp_replace(coalesce(a.phone,''),'\D','','g')=normalized_phone)
     and not exists(select 1 from public.hpt_learner_student_summary l where l.school_id=school_row.id and l.phone_normalized=normalized_phone) then
    return null;
  end if;

  select jsonb_build_object(
    'school_id',school_row.id,
    'school_name',school_row.school_name,
    'candidate_name',coalesce(
      (select a.candidate_name from public.hpt_attempts a where a.school_id=school_row.id
        and regexp_replace(coalesce(a.phone,''),'\D','','g')=normalized_phone
        order by a.completed_at desc nulls last,a.started_at desc limit 1),
      (select l.candidate_name from public.hpt_learner_student_summary l where l.school_id=school_row.id and l.phone_normalized=normalized_phone),
      'Student'),
    'phone',p_phone,
    'hpt_attempt_count',(select count(*)::integer from public.hpt_attempts a where a.school_id=school_row.id
      and a.completed_at is not null and regexp_replace(coalesce(a.phone,''),'\D','','g')=normalized_phone),
    'learner_attempt_count',coalesce((select l.attempt_count from public.hpt_learner_student_summary l
      where l.school_id=school_row.id and l.phone_normalized=normalized_phone),0),
    'best_hpt_score',(select max(a.total_score)::integer from public.hpt_attempts a where a.school_id=school_row.id
      and a.completed_at is not null and regexp_replace(coalesce(a.phone,''),'\D','','g')=normalized_phone),
    'best_learner_score',(select l.best_score from public.hpt_learner_student_summary l
      where l.school_id=school_row.id and l.phone_normalized=normalized_phone)
  ) into result;
  return result;
end;
$$;
revoke all on function public.hpt_get_student_profile_by_school(text,uuid,text) from public;
grant execute on function public.hpt_get_student_profile_by_school(text,uuid,text) to anon,authenticated;

comment on table public.hpt_learner_student_summary is 'Only lifetime learner mock attempt count and highest score per school/mobile number. Individual learner attempts and answer histories are not retained.';
comment on column public.hpt_attempts.learner_score is 'Best Learner Mock Test score out of 30; mirrored from the aggregate learner summary.';
