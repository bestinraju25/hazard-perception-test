-- HPT V118: Indian state / union-territory support and Kerala-only Learner's Mock Test access
-- Run once in the same Supabase project after the V117 school-registration migration.
-- Existing school rows are retained and assigned Kerala because all currently registered schools are Kerala schools.

begin;

alter table public.hpt_schools
  add column if not exists state text not null default 'Kerala';
update public.hpt_schools
   set state = 'Kerala'
 where state is null or btrim(state) = '';
alter table public.hpt_schools alter column state set default 'Kerala';
alter table public.hpt_schools alter column state set not null;

-- States and Union Territories accepted by the registration and manager forms.
alter table public.hpt_schools drop constraint if exists hpt_schools_state_check;
alter table public.hpt_schools add constraint hpt_schools_state_check check (state in (
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana',
  'Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur',
  'Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu','Delhi',
  'Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry'
));

-- Remove the older four-argument overload so the selected state cannot be skipped by the public registration endpoint.
drop function if exists public.register_hpt_school(text,text,text,text);

-- Replace registration RPC with a state-aware version. Keep new schools disabled until admin approval.
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
  v_contact_digits text;
  v_state text := btrim(coalesce(p_state,''));
  v_attempt integer := 0;
begin
  v_contact_digits := regexp_replace(coalesce(p_contact_number,''), '\D', '', 'g');
  if length(btrim(coalesce(p_school_name,''))) < 2
     or length(btrim(coalesce(p_location,''))) < 2
     or length(v_contact_digits) < 10
     or length(v_contact_digits) > 15 then
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
  if p_logo_url is null
     or left(p_logo_url, length('https://nceufqdvuuztdfyesbxx.supabase.co/storage/v1/object/public/hpt-school-logos/public-registration/'))
        <> 'https://nceufqdvuuztdfyesbxx.supabase.co/storage/v1/object/public/hpt-school-logos/public-registration/' then
    raise exception 'Please upload a valid driving school logo.';
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
        '#ffc400', '#0b1b29', false, 'pending_approval', 'pending_manual_verification',
        now(), now()
      ) returning id into v_school_id;
      exit;
    exception when unique_violation then
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

-- Include state in the verified school object consumed by app.js and persisted in the school session.
create or replace function public.verify_hpt_school_access_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school public.hpt_schools%rowtype;
begin
  select * into v_school
    from public.hpt_schools
   where lower(trim(access_code)) = lower(trim(coalesce(p_code,'')))
   limit 1;
  if not found then return jsonb_build_object('status','not_found'); end if;
  if not v_school.active then
    return jsonb_build_object('status','disabled','message','Hazard Perception Test Disabled. Please contact the provider to continue using the software.');
  end if;
  return jsonb_build_object('status','active','school',jsonb_build_object(
    'id',v_school.id,
    'school_name',v_school.school_name,
    'contact_number',v_school.contact_number,
    'location',v_school.location,
    'state',coalesce(nullif(v_school.state,''),'Kerala'),
    'logo_url',v_school.logo_url,
    'brand_color',v_school.brand_color,
    'dark_color',v_school.dark_color
  ));
end;
$$;

-- Server-side enforcement: direct learner-result RPC calls are also limited to active Kerala schools.
create or replace function public.hpt_record_learner_attempt(
  p_candidate_name text, p_phone text, p_school_id uuid, p_school_access_code text,
  p_score integer, p_passed boolean default false, p_language text default 'en',
  p_elapsed_seconds integer default 0, p_answers jsonb default '[]'::jsonb,
  p_started_at timestamptz default now(), p_completed_at timestamptz default now()
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
      and s.state='Kerala' and lower(trim(s.access_code))=lower(trim(coalesce(p_school_access_code,'')))) then
    raise exception 'Learner’s Mock Test is available only to active Kerala driving schools.';
  end if;
  insert into public.hpt_learner_student_summary(school_id,phone_normalized,candidate_name,attempt_count,best_score,updated_at)
  values(p_school_id,normalized_phone,trim(p_candidate_name),1,p_score,coalesce(p_completed_at,now()))
  on conflict(school_id,phone_normalized) do update set
    candidate_name=excluded.candidate_name,
    attempt_count=public.hpt_learner_student_summary.attempt_count+1,
    best_score=case when public.hpt_learner_student_summary.best_score is null then excluded.best_score else greatest(public.hpt_learner_student_summary.best_score,excluded.best_score) end,
    updated_at=excluded.updated_at returning * into summary_row;
  update public.hpt_attempts h set learner_score=summary_row.best_score
   where h.school_id=p_school_id and regexp_replace(coalesce(h.phone,''),'\D','','g')=normalized_phone;
  return jsonb_build_object('attempt_count',summary_row.attempt_count,'best_score',summary_row.best_score,'passed',summary_row.best_score>=18);
end;
$$;

revoke all on function public.register_hpt_school(text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.verify_hpt_school_access_code(text) from public;
revoke all on function public.hpt_record_learner_attempt(text,text,uuid,text,integer,boolean,text,integer,jsonb,timestamptz,timestamptz) from public;
grant execute on function public.register_hpt_school(text,text,text,text,text) to anon, authenticated;
grant execute on function public.verify_hpt_school_access_code(text) to anon, authenticated;
grant execute on function public.hpt_record_learner_attempt(text,text,uuid,text,integer,boolean,text,integer,jsonb,timestamptz,timestamptz) to anon, authenticated;

notify pgrst, 'reload schema';
commit;

select
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='hpt_schools' and column_name='state') as school_state_column_exists,
  to_regprocedure('public.register_hpt_school(text,text,text,text,text)') is not null as state_aware_registration_rpc_exists,
  to_regprocedure('public.verify_hpt_school_access_code(text)') is not null as school_verification_rpc_exists,
  (select count(*) from public.hpt_schools where state='Kerala') as existing_kerala_school_count;
