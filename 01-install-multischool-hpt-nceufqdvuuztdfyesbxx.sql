-- RAJU HPT MULTI-SCHOOL INSTALL — TARGET PROJECT nceufqdvuuztdfyesbxx
-- Run the ENTIRE file in the Supabase SQL Editor for project nceufqdvuuztdfyesbxx.
-- This is the canonical installer for this package; do not run the older repair snippets afterward.
-- Creates/updates core HPT tables, hpt_schools, hpt_attempts.school_id, policies, RPCs, seed clips,
-- and hpt-school-logos bucket. Uses CREATE TABLE/ADD COLUMN IF NOT EXISTS and does not drop HPT records.

begin;
create extension if not exists pgcrypto;

-- 1) Manager identity table (created first because RLS policies/functions depend on it).
create table if not exists public.admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.admin_users add column if not exists full_name text;
alter table public.admin_users add column if not exists email text;
alter table public.admin_users add column if not exists active boolean not null default true;
alter table public.admin_users add column if not exists created_at timestamptz not null default now();
alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon, authenticated;
grant select on public.admin_users to authenticated;
drop policy if exists admin_users_read_own_row on public.admin_users;
create policy admin_users_read_own_row on public.admin_users
  for select to authenticated using (id = auth.uid());

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public
as $$
  select exists(select 1 from public.admin_users where id = auth.uid() and active = true);
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- 2) Core HPT tables. Creating these here fixes projects where earlier base migrations were never run.
create table if not exists public.hpt_videos (
  id uuid primary key default gen_random_uuid(),
  clip_code text not null unique,
  title text not null,
  video_path text not null,
  duration_seconds numeric(8,2) default 50,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hpt_hazards (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.hpt_videos(id) on delete cascade,
  hazard_no integer not null check (hazard_no between 1 and 2),
  timestamp_seconds numeric(8,2) not null check (timestamp_seconds >= 0),
  label text,
  created_at timestamptz not null default now(),
  unique(video_id, hazard_no)
);

create table if not exists public.hpt_attempts (
  id uuid primary key default gen_random_uuid(),
  candidate_name text not null,
  phone text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  total_score integer not null default 0 check (total_score between 0 and 100),
  passed boolean,
  clip_order jsonb not null default '[]'::jsonb
);

create table if not exists public.hpt_responses (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.hpt_attempts(id) on delete cascade,
  video_id uuid references public.hpt_videos(id) on delete set null,
  response_no integer not null,
  click_time_seconds numeric(8,2) not null,
  hazard_no integer,
  awarded_marks integer not null default 0,
  clip_code text,
  created_at timestamptz not null default now()
);

-- Bring older HPT table versions up to the columns this site uses without deleting data.
alter table public.hpt_videos add column if not exists clip_code text;
alter table public.hpt_videos add column if not exists title text;
alter table public.hpt_videos add column if not exists video_path text;
alter table public.hpt_videos add column if not exists duration_seconds numeric(8,2) default 50;
alter table public.hpt_videos add column if not exists active boolean not null default true;
alter table public.hpt_videos add column if not exists created_at timestamptz not null default now();
alter table public.hpt_videos add column if not exists updated_at timestamptz not null default now();
alter table public.hpt_attempts add column if not exists candidate_name text;
alter table public.hpt_attempts add column if not exists phone text;
alter table public.hpt_attempts add column if not exists started_at timestamptz not null default now();
alter table public.hpt_attempts add column if not exists completed_at timestamptz;
alter table public.hpt_attempts add column if not exists total_score integer not null default 0;
alter table public.hpt_attempts add column if not exists passed boolean;
alter table public.hpt_attempts add column if not exists clip_order jsonb not null default '[]'::jsonb;
alter table public.hpt_responses add column if not exists attempt_id uuid;
alter table public.hpt_responses add column if not exists video_id uuid;
alter table public.hpt_responses add column if not exists response_no integer not null default 1;
alter table public.hpt_responses add column if not exists click_time_seconds numeric(8,2) not null default 0;
alter table public.hpt_responses add column if not exists hazard_no integer;
alter table public.hpt_responses add column if not exists awarded_marks integer not null default 0;
alter table public.hpt_responses add column if not exists clip_code text;
alter table public.hpt_responses add column if not exists created_at timestamptz not null default now();

-- One-hazard clips may award up to 10 marks per response.
alter table public.hpt_responses drop constraint if exists hpt_responses_awarded_marks_check;
alter table public.hpt_responses add constraint hpt_responses_awarded_marks_check check (awarded_marks between 0 and 10);
create index if not exists hpt_attempts_date_idx on public.hpt_attempts(started_at desc);
create index if not exists hpt_attempts_candidate_name_idx on public.hpt_attempts(lower(candidate_name));
create index if not exists hpt_attempts_phone_idx on public.hpt_attempts(phone);
create index if not exists hpt_hazards_video_idx on public.hpt_hazards(video_id);
create index if not exists hpt_responses_attempt_idx on public.hpt_responses(attempt_id);
create index if not exists hpt_responses_attempt_clip_idx on public.hpt_responses(attempt_id, clip_code);

-- 3) Existing single-school settings, retained for the older manager page.
create table if not exists public.hpt_settings (
  id integer primary key check (id = 1),
  access_code text not null default '1234',
  updated_at timestamptz not null default now()
);
insert into public.hpt_settings(id, access_code) values (1, '1234') on conflict (id) do nothing;
alter table public.hpt_settings enable row level security;
revoke all on public.hpt_settings from anon, authenticated;
grant select, update on public.hpt_settings to authenticated;
drop policy if exists hpt_settings_admin_select on public.hpt_settings;
drop policy if exists hpt_settings_admin_update on public.hpt_settings;
create policy hpt_settings_admin_select on public.hpt_settings for select to authenticated using (public.is_admin());
create policy hpt_settings_admin_update on public.hpt_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.verify_hpt_access_code(p_code text) returns boolean
language sql security definer set search_path = public
as $$ select exists(select 1 from public.hpt_settings where id = 1 and access_code = coalesce(p_code, '')); $$;
revoke all on function public.verify_hpt_access_code(text) from public;
grant execute on function public.verify_hpt_access_code(text) to anon, authenticated;

-- 4) School registry and branding.
create table if not exists public.hpt_schools (
  id uuid primary key default gen_random_uuid(),
  school_name text not null check (length(trim(school_name)) > 0),
  contact_number text not null default '',
  location text not null default '',
  access_code text not null check (length(trim(access_code)) >= 4),
  logo_url text,
  brand_color text not null default '#ffc400' check (brand_color ~ '^#[0-9A-Fa-f]{6}$'),
  dark_color text not null default '#0b1b29' check (dark_color ~ '^#[0-9A-Fa-f]{6}$'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists hpt_schools_access_code_lower_uidx on public.hpt_schools(lower(trim(access_code)));
create index if not exists hpt_schools_name_idx on public.hpt_schools(school_name);

-- Preserve the existing Raju access code if settings already had one; otherwise use 1234.
insert into public.hpt_schools(school_name, contact_number, location, access_code, brand_color, dark_color, active)
select 'RAJU DRIVING SCHOOL', '', 'Chalakudy, Kerala', s.access_code, '#ffc400', '#0b1b29', true
from public.hpt_settings s
where s.id = 1 and nullif(trim(s.access_code), '') is not null
  and not exists (select 1 from public.hpt_schools h where lower(trim(h.school_name)) = 'raju driving school')
on conflict do nothing;

alter table public.hpt_attempts add column if not exists school_id uuid;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'hpt_attempts_school_id_fkey' and conrelid = 'public.hpt_attempts'::regclass) then
    alter table public.hpt_attempts add constraint hpt_attempts_school_id_fkey
      foreign key (school_id) references public.hpt_schools(id) on delete set null;
  end if;
end $$;
create index if not exists hpt_attempts_school_date_idx on public.hpt_attempts(school_id, started_at desc);

alter table public.hpt_schools enable row level security;
revoke all on public.hpt_schools from anon, authenticated;
grant select, insert, update, delete on public.hpt_schools to authenticated;
drop policy if exists hpt_schools_manager_select on public.hpt_schools;
drop policy if exists hpt_schools_manager_insert on public.hpt_schools;
drop policy if exists hpt_schools_manager_update on public.hpt_schools;
drop policy if exists hpt_schools_manager_delete on public.hpt_schools;
create policy hpt_schools_manager_select on public.hpt_schools for select to authenticated using (public.is_admin());
create policy hpt_schools_manager_insert on public.hpt_schools for insert to authenticated with check (public.is_admin());
create policy hpt_schools_manager_update on public.hpt_schools for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy hpt_schools_manager_delete on public.hpt_schools for delete to authenticated using (public.is_admin());

create or replace function public.verify_hpt_school_access_code(p_code text) returns jsonb
language sql security definer set search_path = public
as $$
  select jsonb_build_object('id', s.id, 'school_name', s.school_name, 'contact_number', s.contact_number,
    'location', s.location, 'logo_url', s.logo_url, 'brand_color', s.brand_color, 'dark_color', s.dark_color)
  from public.hpt_schools s
  where s.active = true and lower(trim(s.access_code)) = lower(trim(coalesce(p_code, '')))
  limit 1;
$$;
revoke all on function public.verify_hpt_school_access_code(text) from public;
grant execute on function public.verify_hpt_school_access_code(text) to anon, authenticated;

-- 5) HPT content and result table security policies.
alter table public.hpt_videos enable row level security;
alter table public.hpt_hazards enable row level security;
alter table public.hpt_attempts enable row level security;
alter table public.hpt_responses enable row level security;
grant select on public.hpt_videos, public.hpt_hazards to anon, authenticated;
grant insert, update, delete on public.hpt_videos, public.hpt_hazards to authenticated;
grant select, insert, delete on public.hpt_attempts, public.hpt_responses to anon, authenticated;

drop policy if exists "hpt active videos public read" on public.hpt_videos;
drop policy if exists "hpt admin authenticated read videos" on public.hpt_videos;
drop policy if exists "hpt admin authenticated insert videos" on public.hpt_videos;
drop policy if exists "hpt admin authenticated update videos" on public.hpt_videos;
drop policy if exists "hpt admin authenticated delete videos" on public.hpt_videos;
drop policy if exists hpt_videos_public_active_select on public.hpt_videos;
drop policy if exists hpt_videos_admin_insert on public.hpt_videos;
drop policy if exists hpt_videos_admin_update on public.hpt_videos;
drop policy if exists hpt_videos_admin_delete on public.hpt_videos;
create policy hpt_videos_public_active_select on public.hpt_videos for select to anon, authenticated using (active = true or public.is_admin());
create policy hpt_videos_admin_insert on public.hpt_videos for insert to authenticated with check (public.is_admin());
create policy hpt_videos_admin_update on public.hpt_videos for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy hpt_videos_admin_delete on public.hpt_videos for delete to authenticated using (public.is_admin());

drop policy if exists "hpt hazards public read" on public.hpt_hazards;
drop policy if exists "hpt admin authenticated read hazards" on public.hpt_hazards;
drop policy if exists "hpt admin authenticated insert hazards" on public.hpt_hazards;
drop policy if exists "hpt admin authenticated update hazards" on public.hpt_hazards;
drop policy if exists "hpt admin authenticated delete hazards" on public.hpt_hazards;
drop policy if exists hpt_hazards_public_active_select on public.hpt_hazards;
drop policy if exists hpt_hazards_admin_insert on public.hpt_hazards;
drop policy if exists hpt_hazards_admin_update on public.hpt_hazards;
drop policy if exists hpt_hazards_admin_delete on public.hpt_hazards;
create policy hpt_hazards_public_active_select on public.hpt_hazards for select to anon, authenticated
  using (exists(select 1 from public.hpt_videos v where v.id = video_id and (v.active = true or public.is_admin())));
create policy hpt_hazards_admin_insert on public.hpt_hazards for insert to authenticated with check (public.is_admin());
create policy hpt_hazards_admin_update on public.hpt_hazards for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy hpt_hazards_admin_delete on public.hpt_hazards for delete to authenticated using (public.is_admin());

drop policy if exists "hpt attempts public insert" on public.hpt_attempts;
drop policy if exists "hpt admin authenticated read attempts" on public.hpt_attempts;
drop policy if exists hpt_attempts_candidate_insert on public.hpt_attempts;
drop policy if exists hpt_attempts_admin_select on public.hpt_attempts;
drop policy if exists hpt_attempts_admin_delete on public.hpt_attempts;
create policy hpt_attempts_candidate_insert on public.hpt_attempts for insert to anon, authenticated with check (true);
create policy hpt_attempts_admin_select on public.hpt_attempts for select to authenticated using (public.is_admin());
create policy hpt_attempts_admin_delete on public.hpt_attempts for delete to authenticated using (public.is_admin());

drop policy if exists "hpt responses public insert" on public.hpt_responses;
drop policy if exists "hpt admin authenticated read responses" on public.hpt_responses;
drop policy if exists hpt_responses_candidate_insert on public.hpt_responses;
drop policy if exists hpt_responses_admin_select on public.hpt_responses;
drop policy if exists hpt_responses_admin_delete on public.hpt_responses;
create policy hpt_responses_candidate_insert on public.hpt_responses for insert to anon, authenticated with check (true);
create policy hpt_responses_admin_select on public.hpt_responses for select to authenticated using (public.is_admin());
create policy hpt_responses_admin_delete on public.hpt_responses for delete to authenticated using (public.is_admin());

-- 6) RPCs for school code validation, recording attempts and school-specific candidate history.
drop function if exists public.hpt_record_attempt(text,text,timestamptz,timestamptz,integer,boolean,jsonb,jsonb);
drop function if exists public.hpt_record_attempt(text,text,timestamptz,timestamptz,integer,boolean,jsonb,jsonb,uuid,text);
create or replace function public.hpt_record_attempt(
  candidate_name text, phone text, started_at timestamptz, completed_at timestamptz,
  total_score integer, passed boolean, clip_order jsonb, responses jsonb default '[]'::jsonb,
  p_school_id uuid default null, p_school_access_code text default null
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare new_id uuid := gen_random_uuid(); r jsonb;
begin
  if nullif(trim(candidate_name), '') is null then raise exception 'Candidate name is required.'; end if;
  if nullif(trim(phone), '') is null then raise exception 'Phone number is required.'; end if;
  if total_score is null or total_score < 0 or total_score > 100 then raise exception 'Invalid HPT score.'; end if;
  if coalesce(jsonb_typeof(clip_order), 'null') <> 'array' then raise exception 'Invalid clip order.'; end if;
  if p_school_id is not null and not exists (
    select 1 from public.hpt_schools s where s.id = p_school_id and s.active = true
      and lower(trim(s.access_code)) = lower(trim(coalesce(p_school_access_code, '')))
  ) then raise exception 'School access is invalid or disabled.'; end if;

  insert into public.hpt_attempts(id,candidate_name,phone,started_at,completed_at,total_score,passed,clip_order,school_id)
  values(new_id,trim(candidate_name),trim(phone),coalesce(started_at,now()),completed_at,total_score,(total_score >= 60),clip_order,p_school_id);

  if jsonb_typeof(coalesce(responses,'[]'::jsonb)) = 'array' then
    for r in select * from jsonb_array_elements(coalesce(responses,'[]'::jsonb)) loop
      insert into public.hpt_responses(attempt_id,video_id,clip_code,response_no,click_time_seconds,hazard_no,awarded_marks)
      values(new_id,nullif(r->>'video_id','')::uuid,nullif(trim(r->>'clip_code'),''),
        greatest(1,coalesce(nullif(r->>'response_no','')::integer,1)),
        greatest(0,coalesce(nullif(r->>'click_time_seconds','')::numeric,0)),
        nullif(r->>'hazard_no','')::integer,
        greatest(0,least(10,coalesce(nullif(r->>'awarded_marks','')::integer,0))));
    end loop;
  end if;
  return new_id;
end;
$$;
revoke all on function public.hpt_record_attempt(text,text,timestamptz,timestamptz,integer,boolean,jsonb,jsonb,uuid,text) from public;
grant execute on function public.hpt_record_attempt(text,text,timestamptz,timestamptz,integer,boolean,jsonb,jsonb,uuid,text) to anon, authenticated;

drop function if exists public.hpt_get_candidate_attempts_by_school(text, uuid);
create or replace function public.hpt_get_candidate_attempts_by_school(p_phone text, p_school_id uuid)
returns table(id uuid,candidate_name text,phone text,started_at timestamptz,completed_at timestamptz,total_score integer,passed boolean,report_data jsonb)
language sql security definer set search_path = public
as $$
  select a.id,a.candidate_name,a.phone,a.started_at,a.completed_at,a.total_score,a.passed,
    jsonb_build_object('clip_order',coalesce(a.clip_order,'[]'::jsonb),'responses',coalesce((
      select jsonb_agg(jsonb_build_object('response_no',r.response_no,'clip_code',r.clip_code,'video_id',r.video_id,
        'click_time_seconds',r.click_time_seconds,'hazard_no',r.hazard_no,'awarded_marks',r.awarded_marks)
      order by r.response_no,r.created_at) from public.hpt_responses r where r.attempt_id=a.id),'[]'::jsonb))
  from public.hpt_attempts a
  where regexp_replace(coalesce(a.phone,''),'\D','','g') = regexp_replace(coalesce(p_phone,''),'\D','','g')
    and nullif(regexp_replace(coalesce(p_phone,''),'\D','','g'),'') is not null
    and a.school_id=p_school_id
  order by a.completed_at desc nulls last,a.started_at desc limit 50;
$$;
revoke all on function public.hpt_get_candidate_attempts_by_school(text,uuid) from public;
grant execute on function public.hpt_get_candidate_attempts_by_school(text,uuid) to anon, authenticated;

-- Legacy lookup remains available for old clients; the current school portal uses the scoped RPC above.
drop function if exists public.hpt_get_candidate_attempts(text);
create or replace function public.hpt_get_candidate_attempts(p_phone text)
returns table(id uuid,candidate_name text,phone text,started_at timestamptz,completed_at timestamptz,total_score integer,passed boolean,report_data jsonb)
language sql security definer set search_path = public
as $$
  select a.id,a.candidate_name,a.phone,a.started_at,a.completed_at,a.total_score,a.passed,
    jsonb_build_object('clip_order',coalesce(a.clip_order,'[]'::jsonb),'responses',coalesce((
      select jsonb_agg(jsonb_build_object('response_no',r.response_no,'clip_code',r.clip_code,'video_id',r.video_id,
        'click_time_seconds',r.click_time_seconds,'hazard_no',r.hazard_no,'awarded_marks',r.awarded_marks)
      order by r.response_no,r.created_at) from public.hpt_responses r where r.attempt_id=a.id),'[]'::jsonb))
  from public.hpt_attempts a
  where regexp_replace(coalesce(a.phone,''),'\D','','g') = regexp_replace(coalesce(p_phone,''),'\D','','g')
    and nullif(regexp_replace(coalesce(p_phone,''),'\D','','g'),'') is not null
  order by a.completed_at desc nulls last,a.started_at desc limit 50;
$$;
revoke all on function public.hpt_get_candidate_attempts(text) from public;
grant execute on function public.hpt_get_candidate_attempts(text) to anon, authenticated;

-- Seed the 10 built-in clips only when each clip code is absent. Video files stay on the website.
insert into public.hpt_videos(clip_code,title,video_path,duration_seconds,active) values
('01','Hazard Perception Clip 01','videos/1.webm',50,true),('02','Hazard Perception Clip 02','videos/2.webm',50,true),
('03','Hazard Perception Clip 03','videos/3.webm',50,true),('04','Hazard Perception Clip 04','videos/4.webm',50,true),
('05','Hazard Perception Clip 05','videos/5.webm',50,true),('06','Hazard Perception Clip 06','videos/6.webm',50,true),
('07','Hazard Perception Clip 07','videos/7.webm',50,true),('08','Hazard Perception Clip 08','videos/8.webm',50,true),
('09','Hazard Perception Clip 09','videos/9.webm',50,true),('10','Hazard Perception Clip 10','videos/10.webm',50,true)
on conflict(clip_code) do nothing;

insert into public.hpt_hazards(video_id,hazard_no,timestamp_seconds,label)
select v.id,x.hazard_no,x.timestamp_seconds,x.label
from (values
 ('01',1,22::numeric,'Oncoming vehicle conflict'),('01',2,30::numeric,'Vehicle approaching tunnel'),
 ('02',1,9::numeric,'Vehicle conflict at junction'),('02',2,35::numeric,'Cyclist developing hazard'),
 ('03',1,6::numeric,'Vehicle emerging from side road'),('03',2,24::numeric,'Vehicle crossing / converging'),
 ('04',1,32::numeric,'Large vehicle entering / converging'),('04',2,38::numeric,'Pedestrian crossing'),
 ('05',1,14::numeric,'Van approaching close'),('05',2,35::numeric,'Large tractor passing close'),
 ('06',1,7::numeric,'Vehicle emerging from side road'),('06',2,34::numeric,'Cyclist / vehicle conflict'),
 ('07',1,2::numeric,'Roadworks / refuge obstruction'),('07',2,47::numeric,'Cyclist close to lane'),
 ('08',1,32::numeric,'Truck moving into lane'),('08',2,39::numeric,'Large vehicle passing close'),
 ('09',1,7::numeric,'Vehicle crossing from side road'),('09',2,37::numeric,'Large vehicle crossing'),
 ('10',1,8::numeric,'Oncoming vehicle conflict'),('10',2,42::numeric,'Pedestrian / roadside conflict')
) as x(clip_code,hazard_no,timestamp_seconds,label)
join public.hpt_videos v on v.clip_code=x.clip_code
on conflict(video_id,hazard_no) do nothing;

-- 7) Logo storage bucket and manager-only writes.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('hpt-school-logos','hpt-school-logos',true,5242880,array['image/png','image/jpeg','image/webp','image/svg+xml'])
on conflict(id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/png','image/jpeg','image/webp','image/svg+xml'];
drop policy if exists hpt_school_logos_public_read on storage.objects;
drop policy if exists hpt_school_logos_manager_insert on storage.objects;
drop policy if exists hpt_school_logos_manager_update on storage.objects;
drop policy if exists hpt_school_logos_manager_delete on storage.objects;
create policy hpt_school_logos_public_read on storage.objects for select to anon, authenticated using(bucket_id='hpt-school-logos');
create policy hpt_school_logos_manager_insert on storage.objects for insert to authenticated with check(bucket_id='hpt-school-logos' and public.is_admin());
create policy hpt_school_logos_manager_update on storage.objects for update to authenticated using(bucket_id='hpt-school-logos' and public.is_admin()) with check(bucket_id='hpt-school-logos' and public.is_admin());
create policy hpt_school_logos_manager_delete on storage.objects for delete to authenticated using(bucket_id='hpt-school-logos' and public.is_admin());

notify pgrst, 'reload schema';
commit;
