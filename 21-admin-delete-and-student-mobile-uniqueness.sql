-- HPT V119: school contact uniqueness, one student identity per school/mobile,
-- latest-name canonicalisation, admin delete actions and admin identity lookup.
-- Run AFTER migrations 17, 18, 19 and 20 in the same Supabase project.
-- This migration preserves existing HPT attempts and videos. School deletion is explicit/admin-only.

begin;
create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1) School contact mobile uniqueness (all formats normalised to the last 10 digits)
-- -----------------------------------------------------------------------------
-- A one-row registry with a primary key on the last 10 digits protects against
-- duplicate school contacts even when two registrations arrive at the same time.
-- For legacy duplicate numbers, the earliest existing school is initially the owner;
-- the diagnostic at the end lists any duplicates that should be resolved manually.
create table if not exists public.hpt_school_mobile_registry (
  mobile_last10 text primary key check (mobile_last10 ~ '^[0-9]{10}$'),
  school_id uuid not null unique references public.hpt_schools(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.hpt_school_mobile_registry enable row level security;
revoke all on public.hpt_school_mobile_registry from public, anon, authenticated;

insert into public.hpt_school_mobile_registry(mobile_last10, school_id)
select distinct on (right(regexp_replace(coalesce(contact_number,''), '\D', '', 'g'), 10))
       right(regexp_replace(coalesce(contact_number,''), '\D', '', 'g'), 10), id
  from public.hpt_schools
 where length(regexp_replace(coalesce(contact_number,''), '\D', '', 'g')) >= 10
 order by right(regexp_replace(coalesce(contact_number,''), '\D', '', 'g'), 10), created_at, id
on conflict (mobile_last10) do nothing;

create or replace function public.hpt_enforce_unique_school_contact_mobile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_digits text;
  v_old_digits text;
  v_new_mobile text;
  v_old_mobile text;
  v_owner uuid;
begin
  v_new_digits := regexp_replace(coalesce(new.contact_number,''), '\D', '', 'g');
  if length(v_new_digits) < 10 then
    return new;
  end if;
  v_new_mobile := right(v_new_digits, 10);

  if tg_op = 'UPDATE' then
    v_old_digits := regexp_replace(coalesce(old.contact_number,''), '\D', '', 'g');
    if length(v_old_digits) >= 10 then v_old_mobile := right(v_old_digits,10); end if;
    if v_old_mobile is distinct from v_new_mobile then
      delete from public.hpt_school_mobile_registry
       where mobile_last10 = v_old_mobile and school_id = new.id;
    end if;
  end if;

  -- The registry primary key serialises concurrent claims for a mobile number.
  insert into public.hpt_school_mobile_registry(mobile_last10,school_id)
  values(v_new_mobile,new.id)
  on conflict (mobile_last10) do nothing;

  select school_id into v_owner from public.hpt_school_mobile_registry
   where mobile_last10 = v_new_mobile;
  if v_owner is distinct from new.id then
    raise exception 'This mobile number is already registered. Please use a different mobile number. If you forgot the access code, use Forgot Access Code?'
      using errcode = 'P0001';
  end if;

  -- If the previous contact number had legacy duplicates, transfer its registry
  -- claim to one of the remaining schools after the current owner changes number.
  if tg_op = 'UPDATE' and v_old_mobile is not null and v_old_mobile is distinct from v_new_mobile then
    insert into public.hpt_school_mobile_registry(mobile_last10,school_id)
    select v_old_mobile, s.id
      from public.hpt_schools s
     where s.id is distinct from new.id
       and length(regexp_replace(coalesce(s.contact_number,''), '\D', '', 'g')) >= 10
       and right(regexp_replace(coalesce(s.contact_number,''), '\D', '', 'g'),10) = v_old_mobile
     order by s.created_at, s.id
     limit 1
    on conflict (mobile_last10) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists hpt_schools_unique_contact_mobile on public.hpt_schools;
create trigger hpt_schools_unique_contact_mobile
after insert or update of contact_number on public.hpt_schools
for each row execute function public.hpt_enforce_unique_school_contact_mobile();

-- Replace the public registration RPC so duplicate school numbers receive a clear
-- message before an access code is allocated. The trigger above is the race-safe guard.
create or replace function public.register_hpt_school(
  p_school_name text,
  p_location text,
  p_contact_number text,
  p_logo_url text,
  p_state text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_school_id uuid;
  v_digits text;
  v_state text := btrim(coalesce(p_state,''));
  v_attempt integer := 0;
begin
  v_digits := regexp_replace(coalesce(p_contact_number,''), '\D', '', 'g');
  if length(btrim(coalesce(p_school_name,''))) < 2
     or length(btrim(coalesce(p_location,''))) < 2
     or length(v_digits) < 10
     or length(v_digits) > 15 then
    raise exception 'Enter a valid school name, state, location and contact number.';
  end if;

  if v_state not in (
    'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana',
    'Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur',
    'Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
    'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
    'Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu','Delhi',
    'Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry'
  ) then
    raise exception 'Select a valid Indian state or union territory.';
  end if;

  if p_logo_url is not null
     and left(p_logo_url, length('https://nceufqdvuuztdfyesbxx.supabase.co/storage/v1/object/public/hpt-school-logos/public-registration/'))
        <> 'https://nceufqdvuuztdfyesbxx.supabase.co/storage/v1/object/public/hpt-school-logos/public-registration/' then
    raise exception 'Please upload a valid driving school logo.';
  end if;

  if exists (
    select 1 from public.hpt_schools s
    where length(regexp_replace(coalesce(s.contact_number,''), '\D', '', 'g')) >= 10
      and right(regexp_replace(coalesce(s.contact_number,''), '\D', '', 'g'), 10) = right(v_digits, 10)
  ) then
    raise exception 'This mobile number is already registered. Please use a different mobile number. If you forgot the access code, use Forgot Access Code?'
      using errcode = 'P0001';
  end if;

  loop
    v_code := lpad(floor(random() * 10000)::integer::text, 4, '0');
    begin
      insert into public.hpt_schools (
        school_name, contact_number, location, state, access_code, logo_url,
        brand_color, dark_color, active, registration_status, payment_status,
        created_at, updated_at
      ) values (
        btrim(p_school_name), btrim(p_contact_number), btrim(p_location), v_state, v_code, p_logo_url,
        '#ffc400', '#0b1b29', false, 'pending_approval', 'pending_manual_verification', now(), now()
      ) returning id into v_school_id;
      exit;
    exception when unique_violation then
      -- This loop handles access-code collisions. The school-mobile guard raises P0001.
      v_attempt := v_attempt + 1;
      if v_attempt >= 100 then
        raise exception 'A unique access code could not be generated. Please try again.';
      end if;
    end;
  end loop;

  return jsonb_build_object(
    'school_id', v_school_id,
    'access_code', v_code,
    'state', v_state,
    'registration_status', 'pending_approval',
    'active', false
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 2) Canonical student identity: one current name per school + mobile number
-- -----------------------------------------------------------------------------
create table if not exists public.hpt_student_directory (
  school_id uuid not null references public.hpt_schools(id) on delete cascade,
  phone_normalized text not null check (phone_normalized ~ '^[0-9]{10}$'),
  candidate_name text not null default 'Student',
  updated_at timestamptz not null default now(),
  primary key (school_id, phone_normalized)
);
alter table public.hpt_student_directory enable row level security;
revoke all on public.hpt_student_directory from public, anon, authenticated;

-- Normalise and consolidate legacy learner summary rows (for example, 91XXXXXXXXXX
-- and XXXXXXXXXX) into one row per school/mobile. Counts are added; best score is retained.
create temporary table hpt_v119_learner_summary_rollup on commit drop as
select
  school_id,
  right(regexp_replace(coalesce(phone_normalized,''), '\D', '', 'g'), 10) as phone_normalized,
  (array_agg(candidate_name order by updated_at desc nulls last, candidate_name))[1] as candidate_name,
  sum(attempt_count)::integer as attempt_count,
  max(best_score)::integer as best_score,
  max(updated_at) as updated_at
from public.hpt_learner_student_summary
where length(regexp_replace(coalesce(phone_normalized,''), '\D', '', 'g')) >= 10
group by school_id, right(regexp_replace(coalesce(phone_normalized,''), '\D', '', 'g'), 10);

delete from public.hpt_learner_student_summary;
insert into public.hpt_learner_student_summary
  (school_id, phone_normalized, candidate_name, attempt_count, best_score, updated_at)
select school_id, phone_normalized, coalesce(nullif(candidate_name,''),'Student'), attempt_count, best_score, coalesce(updated_at,now())
from hpt_v119_learner_summary_rollup;

-- Backfill the single canonical name from the newest existing HPT or Learner record.
with candidates as (
  select a.school_id,
         right(regexp_replace(coalesce(a.phone,''), '\D', '', 'g'), 10) as phone_normalized,
         a.candidate_name,
         coalesce(a.completed_at, a.started_at, now()) as changed_at
    from public.hpt_attempts a
   where a.school_id is not null
     and length(regexp_replace(coalesce(a.phone,''), '\D', '', 'g')) >= 10
  union all
  select l.school_id,
         right(regexp_replace(coalesce(l.phone_normalized,''), '\D', '', 'g'), 10),
         l.candidate_name,
         coalesce(l.updated_at, now())
    from public.hpt_learner_student_summary l
   where length(regexp_replace(coalesce(l.phone_normalized,''), '\D', '', 'g')) >= 10
), newest as (
  select distinct on (school_id, phone_normalized)
         school_id, phone_normalized, candidate_name, changed_at
    from candidates
   where phone_normalized ~ '^[0-9]{10}$'
   order by school_id, phone_normalized, changed_at desc
)
insert into public.hpt_student_directory(school_id, phone_normalized, candidate_name, updated_at)
select school_id, phone_normalized, coalesce(nullif(candidate_name,''),'Student'), changed_at
  from newest
on conflict (school_id, phone_normalized) do update
  set candidate_name = excluded.candidate_name,
      updated_at = greatest(public.hpt_student_directory.updated_at, excluded.updated_at);

-- Keep the legacy mirrored Learner best score aligned with the compact summary table.
update public.hpt_attempts a
   set learner_score = l.best_score
  from public.hpt_learner_student_summary l
 where a.school_id = l.school_id
   and right(regexp_replace(coalesce(a.phone,''), '\D', '', 'g'), 10) = l.phone_normalized;

create or replace function public.hpt_upsert_student_identity(
  p_candidate_name text,
  p_phone text,
  p_school_id uuid,
  p_school_access_code text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_digits text;
  v_mobile text;
  v_name text := btrim(coalesce(p_candidate_name,''));
  v_row public.hpt_student_directory%rowtype;
begin
  v_digits := regexp_replace(coalesce(p_phone,''), '\D', '', 'g');
  if length(v_name) < 2 then raise exception 'Enter a valid student name.'; end if;
  if length(v_digits) < 10 or length(v_digits) > 15 then raise exception 'Enter a valid student mobile number.'; end if;
  v_mobile := right(v_digits,10);

  if not exists (
    select 1 from public.hpt_schools s
    where s.id = p_school_id and s.active = true
      and lower(trim(s.access_code)) = lower(trim(coalesce(p_school_access_code,'')))
  ) then
    raise exception 'School access is invalid or disabled.';
  end if;

  insert into public.hpt_student_directory(school_id, phone_normalized, candidate_name, updated_at)
  values (p_school_id, v_mobile, v_name, now())
  on conflict (school_id, phone_normalized) do update
    set candidate_name = excluded.candidate_name,
        updated_at = excluded.updated_at
  returning * into v_row;

  return jsonb_build_object('school_id',v_row.school_id,'phone',v_row.phone_normalized,
                            'candidate_name',v_row.candidate_name,'updated_at',v_row.updated_at);
end;
$$;

-- Latest-name updates happen inside the Learner result RPC as well, so the learner
-- application cannot bypass the student identity registry.
create or replace function public.hpt_record_learner_attempt(
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
language plpgsql
security definer
set search_path = public
as $$
declare
  v_digits text;
  v_mobile text;
  v_name text := btrim(coalesce(p_candidate_name,''));
  summary_row public.hpt_learner_student_summary%rowtype;
begin
  v_digits := regexp_replace(coalesce(p_phone,''), '\D', '', 'g');
  if length(v_name) < 2 then raise exception 'Candidate name is required.'; end if;
  if length(v_digits) < 10 or length(v_digits) > 15 then raise exception 'A valid phone number is required.'; end if;
  v_mobile := right(v_digits,10);
  if p_score is null or p_score < 0 or p_score > 30 then raise exception 'Learner score must be between 0 and 30.'; end if;
  if coalesce(p_language,'en') not in ('en','ml') then raise exception 'Language must be en or ml.'; end if;
  if not exists (
    select 1 from public.hpt_schools s where s.id=p_school_id and s.active=true
      and s.state='Kerala'
      and lower(trim(s.access_code))=lower(trim(coalesce(p_school_access_code,'')))
  ) then
    raise exception 'Learner’s Mock Test is available only to active Kerala driving schools.';
  end if;

  insert into public.hpt_student_directory(school_id,phone_normalized,candidate_name,updated_at)
  values(p_school_id,v_mobile,v_name,coalesce(p_completed_at,now()))
  on conflict(school_id,phone_normalized) do update set
    candidate_name=excluded.candidate_name, updated_at=excluded.updated_at;

  insert into public.hpt_learner_student_summary(school_id,phone_normalized,candidate_name,attempt_count,best_score,updated_at)
  values(p_school_id,v_mobile,v_name,1,p_score,coalesce(p_completed_at,now()))
  on conflict(school_id,phone_normalized) do update set
    candidate_name=excluded.candidate_name,
    attempt_count=public.hpt_learner_student_summary.attempt_count+1,
    best_score=case when public.hpt_learner_student_summary.best_score is null then excluded.best_score
                    else greatest(public.hpt_learner_student_summary.best_score,excluded.best_score) end,
    updated_at=excluded.updated_at
  returning * into summary_row;

  update public.hpt_attempts a
     set learner_score=summary_row.best_score
   where a.school_id=p_school_id
     and right(regexp_replace(coalesce(a.phone,''), '\D', '', 'g'), 10)=v_mobile;

  return jsonb_build_object('attempt_count',summary_row.attempt_count,
    'best_score',summary_row.best_score,'passed',summary_row.best_score>=18,
    'candidate_name',summary_row.candidate_name);
end;
$$;

-- Student profile API: return the canonical (most recently entered) name first.
create or replace function public.hpt_get_student_profile_by_school(
  p_phone text,
  p_school_id uuid,
  p_school_access_code text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  school_row public.hpt_schools%rowtype;
  v_digits text;
  v_mobile text;
  result jsonb;
begin
  select * into school_row from public.hpt_schools
   where id=p_school_id and active=true
     and lower(trim(access_code))=lower(trim(coalesce(p_school_access_code,'')))
   limit 1;
  if not found then raise exception 'School access is invalid or disabled.'; end if;

  v_digits := regexp_replace(coalesce(p_phone,''), '\D', '', 'g');
  if length(v_digits) < 10 or length(v_digits) > 15 then raise exception 'A valid phone number is required.'; end if;
  v_mobile := right(v_digits,10);

  if not exists(select 1 from public.hpt_attempts a where a.school_id=school_row.id and a.completed_at is not null
       and right(regexp_replace(coalesce(a.phone,''), '\D', '', 'g'),10)=v_mobile)
     and not exists(select 1 from public.hpt_learner_student_summary l where l.school_id=school_row.id and l.phone_normalized=v_mobile) then
    return null;
  end if;

  select jsonb_build_object(
    'school_id',school_row.id,
    'school_name',school_row.school_name,
    'candidate_name',coalesce(
      (select d.candidate_name from public.hpt_student_directory d where d.school_id=school_row.id and d.phone_normalized=v_mobile),
      (select a.candidate_name from public.hpt_attempts a where a.school_id=school_row.id
        and right(regexp_replace(coalesce(a.phone,''), '\D', '', 'g'),10)=v_mobile
        order by a.completed_at desc nulls last,a.started_at desc limit 1),
      (select l.candidate_name from public.hpt_learner_student_summary l where l.school_id=school_row.id and l.phone_normalized=v_mobile),
      'Student'),
    'phone',v_mobile,
    'hpt_attempt_count',(select count(*)::integer from public.hpt_attempts a where a.school_id=school_row.id
      and a.completed_at is not null and right(regexp_replace(coalesce(a.phone,''), '\D', '', 'g'),10)=v_mobile),
    'learner_attempt_count',coalesce((select l.attempt_count from public.hpt_learner_student_summary l
      where l.school_id=school_row.id and l.phone_normalized=v_mobile),0),
    'best_hpt_score',(select max(a.total_score)::integer from public.hpt_attempts a where a.school_id=school_row.id
      and a.completed_at is not null and right(regexp_replace(coalesce(a.phone,''), '\D', '', 'g'),10)=v_mobile),
    'best_learner_score',(select l.best_score from public.hpt_learner_student_summary l
      where l.school_id=school_row.id and l.phone_normalized=v_mobile)
  ) into result;
  return result;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3) Admin-only operations: read canonical names and delete learner/school records
-- -----------------------------------------------------------------------------
create or replace function public.hpt_admin_list_student_directory()
returns table(school_id uuid, phone_normalized text, candidate_name text, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.admin_users a where a.id=auth.uid() and a.active=true
  ) then
    raise exception 'Not authorised to view the provider student directory.';
  end if;
  return query
    select d.school_id,d.phone_normalized,d.candidate_name,d.updated_at
      from public.hpt_student_directory d
     order by d.updated_at desc;
end;
$$;

create or replace function public.hpt_admin_delete_learner_summary(
  p_school_id uuid,
  p_phone text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_digits text;
  v_mobile text;
  v_deleted integer;
begin
  if auth.uid() is null or not exists (
    select 1 from public.admin_users a where a.id=auth.uid() and a.active=true
  ) then
    raise exception 'Not authorised to delete Learner Mock Test records.';
  end if;
  v_digits := regexp_replace(coalesce(p_phone,''), '\D', '', 'g');
  if length(v_digits) < 10 or length(v_digits) > 15 then raise exception 'A valid student mobile number is required.'; end if;
  v_mobile := right(v_digits,10);

  delete from public.hpt_learner_student_summary
   where school_id=p_school_id and phone_normalized=v_mobile;
  get diagnostics v_deleted = row_count;
  if v_deleted > 0 then
    update public.hpt_attempts a set learner_score=null
     where a.school_id=p_school_id
       and right(regexp_replace(coalesce(a.phone,''), '\D', '', 'g'),10)=v_mobile;
    if not exists (select 1 from public.hpt_attempts a where a.school_id=p_school_id
       and right(regexp_replace(coalesce(a.phone,''), '\D', '', 'g'),10)=v_mobile) then
      delete from public.hpt_student_directory d where d.school_id=p_school_id and d.phone_normalized=v_mobile;
    end if;
  end if;
  return jsonb_build_object('deleted',v_deleted>0,'records_deleted',v_deleted);
end;
$$;

create or replace function public.hpt_admin_delete_school(p_school_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school_name text;
  v_contact_number text;
  v_digits text;
  v_mobile text;
  v_attempts_deleted integer;
begin
  if auth.uid() is null or not exists (
    select 1 from public.admin_users a where a.id=auth.uid() and a.active=true
  ) then
    raise exception 'Not authorised to delete driving schools.';
  end if;

  select school_name, contact_number into v_school_name, v_contact_number from public.hpt_schools where id=p_school_id for update;
  if not found then return jsonb_build_object('deleted',false,'message','The school no longer exists.'); end if;

  delete from public.hpt_attempts where school_id=p_school_id;
  get diagnostics v_attempts_deleted = row_count;
  -- The school FK cascades to Learner summaries and the canonical student directory.
  delete from public.hpt_schools where id=p_school_id;
  v_digits := regexp_replace(coalesce(v_contact_number,''), '\D', '', 'g');
  if length(v_digits) >= 10 then
    v_mobile := right(v_digits,10);
    insert into public.hpt_school_mobile_registry(mobile_last10,school_id)
    select v_mobile, s.id from public.hpt_schools s
     where length(regexp_replace(coalesce(s.contact_number,''), '\D', '', 'g')) >= 10
       and right(regexp_replace(coalesce(s.contact_number,''), '\D', '', 'g'),10)=v_mobile
     order by s.created_at, s.id limit 1
    on conflict (mobile_last10) do nothing;
  end if;
  return jsonb_build_object('deleted',true,'school_name',v_school_name,
                            'attempts_deleted',v_attempts_deleted);
end;
$$;

-- Apply least-privilege grants to the new RPCs. Public users may update their own
-- canonical name only when they present a valid active school access code.
revoke all on function public.hpt_enforce_unique_school_contact_mobile() from public, anon, authenticated;
revoke all on function public.hpt_upsert_student_identity(text,text,uuid,text) from public;
revoke all on function public.hpt_admin_list_student_directory() from public, anon;
revoke all on function public.hpt_admin_delete_learner_summary(uuid,text) from public, anon;
revoke all on function public.hpt_admin_delete_school(uuid) from public, anon;
revoke all on function public.register_hpt_school(text,text,text,text,text) from public;
revoke all on function public.hpt_record_learner_attempt(text,text,uuid,text,integer,boolean,text,integer,jsonb,timestamptz,timestamptz) from public;
revoke all on function public.hpt_get_student_profile_by_school(text,uuid,text) from public;

grant execute on function public.register_hpt_school(text,text,text,text,text) to anon, authenticated;
grant execute on function public.hpt_upsert_student_identity(text,text,uuid,text) to anon, authenticated;
grant execute on function public.hpt_record_learner_attempt(text,text,uuid,text,integer,boolean,text,integer,jsonb,timestamptz,timestamptz) to anon, authenticated;
grant execute on function public.hpt_get_student_profile_by_school(text,uuid,text) to anon, authenticated;
grant execute on function public.hpt_admin_list_student_directory() to authenticated;
grant execute on function public.hpt_admin_delete_learner_summary(uuid,text) to authenticated;
grant execute on function public.hpt_admin_delete_school(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;

-- Verification: these should all return true after the migration is applied.
select
  to_regprocedure('public.hpt_upsert_student_identity(text,text,uuid,text)') is not null as student_identity_rpc_exists,
  to_regprocedure('public.hpt_admin_list_student_directory()') is not null as admin_student_directory_rpc_exists,
  to_regprocedure('public.hpt_admin_delete_learner_summary(uuid,text)') is not null as admin_delete_learner_rpc_exists,
  to_regprocedure('public.hpt_admin_delete_school(uuid)') is not null as admin_delete_school_rpc_exists,
  exists(select 1 from information_schema.triggers where trigger_schema='public' and trigger_name='hpt_schools_unique_contact_mobile') as school_mobile_uniqueness_trigger_exists,
  to_regclass('public.hpt_school_mobile_registry') is not null as school_mobile_registry_exists,
  (select count(*) from public.hpt_student_directory) as canonical_student_identities;

-- Diagnostic: if this query returns rows, they are duplicate phone numbers that
-- existed before V119. The new trigger blocks any additional duplicates.
select right(regexp_replace(coalesce(contact_number,''), '\D', '', 'g'), 10) as mobile_last_10,
       count(*) as school_count,
       string_agg(school_name, ', ' order by school_name) as schools
  from public.hpt_schools
 where length(regexp_replace(coalesce(contact_number,''), '\D', '', 'g')) >= 10
 group by right(regexp_replace(coalesce(contact_number,''), '\D', '', 'g'), 10)
having count(*) > 1;
