-- RAJU HPT production schema / migration v6
-- Video binaries remain on GitHub/static hosting. Supabase stores only metadata, annotations and results.

create extension if not exists pgcrypto;

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
  label text, created_at timestamptz not null default now(),
  unique(video_id,hazard_no)
);
create table if not exists public.hpt_attempts (
  id uuid primary key default gen_random_uuid(), candidate_name text not null, phone text not null,
  started_at timestamptz not null default now(), completed_at timestamptz,
  total_score integer not null default 0 check(total_score between 0 and 100), passed boolean, clip_order jsonb not null default '[]'::jsonb
);
create table if not exists public.hpt_responses (
  id uuid primary key default gen_random_uuid(), attempt_id uuid not null references public.hpt_attempts(id) on delete cascade,
  video_id uuid references public.hpt_videos(id) on delete set null, response_no integer not null, click_time_seconds numeric(8,2) not null,
  hazard_no integer, awarded_marks integer not null default 0 check(awarded_marks between 0 and 5), created_at timestamptz not null default now()
);

-- Reuse the exact admin identity system already used by Raju Driving School.
-- booking-schema.sql defines public.is_admin() as id=auth.uid() and active=true.
create or replace function public.is_admin() returns boolean language sql security definer set search_path=public as $$
  select exists(select 1 from public.admin_users where id=auth.uid() and active=true);
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.hpt_videos enable row level security;
alter table public.hpt_hazards enable row level security;
alter table public.hpt_attempts enable row level security;
alter table public.hpt_responses enable row level security;

-- Remove policies created by earlier HPT prototypes, then recreate hardened policies.
drop policy if exists "hpt active videos public read" on public.hpt_videos;
drop policy if exists "hpt admin authenticated read videos" on public.hpt_videos;
drop policy if exists "hpt admin authenticated insert videos" on public.hpt_videos;
drop policy if exists "hpt admin authenticated update videos" on public.hpt_videos;
drop policy if exists "hpt admin authenticated delete videos" on public.hpt_videos;
drop policy if exists "hpt hazards public read" on public.hpt_hazards;
drop policy if exists "hpt admin authenticated read hazards" on public.hpt_hazards;
drop policy if exists "hpt admin authenticated insert hazards" on public.hpt_hazards;
drop policy if exists "hpt admin authenticated update hazards" on public.hpt_hazards;
drop policy if exists "hpt admin authenticated delete hazards" on public.hpt_hazards;
drop policy if exists "hpt attempts public insert" on public.hpt_attempts;
drop policy if exists "hpt admin authenticated read attempts" on public.hpt_attempts;
drop policy if exists "hpt responses public insert" on public.hpt_responses;
drop policy if exists "hpt admin authenticated read responses" on public.hpt_responses;
drop policy if exists hpt_videos_public_active_select on public.hpt_videos;
drop policy if exists hpt_videos_admin_insert on public.hpt_videos;
drop policy if exists hpt_videos_admin_update on public.hpt_videos;
drop policy if exists hpt_videos_admin_delete on public.hpt_videos;
drop policy if exists hpt_hazards_public_active_select on public.hpt_hazards;
drop policy if exists hpt_hazards_admin_insert on public.hpt_hazards;
drop policy if exists hpt_hazards_admin_update on public.hpt_hazards;
drop policy if exists hpt_hazards_admin_delete on public.hpt_hazards;
drop policy if exists hpt_attempts_candidate_insert on public.hpt_attempts;
drop policy if exists hpt_attempts_admin_select on public.hpt_attempts;
drop policy if exists hpt_responses_candidate_insert on public.hpt_responses;
drop policy if exists hpt_responses_admin_select on public.hpt_responses;

-- Explicit policies.
create policy hpt_videos_public_active_select on public.hpt_videos for select using(active=true or public.is_admin());
create policy hpt_videos_admin_insert on public.hpt_videos for insert to authenticated with check(public.is_admin());
create policy hpt_videos_admin_update on public.hpt_videos for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy hpt_videos_admin_delete on public.hpt_videos for delete to authenticated using(public.is_admin());

create policy hpt_hazards_public_active_select on public.hpt_hazards for select using(exists(select 1 from public.hpt_videos v where v.id=video_id and (v.active=true or public.is_admin())));
create policy hpt_hazards_admin_insert on public.hpt_hazards for insert to authenticated with check(public.is_admin());
create policy hpt_hazards_admin_update on public.hpt_hazards for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy hpt_hazards_admin_delete on public.hpt_hazards for delete to authenticated using(public.is_admin());

create policy hpt_attempts_candidate_insert on public.hpt_attempts for insert with check(true);
create policy hpt_attempts_admin_select on public.hpt_attempts for select to authenticated using(public.is_admin());
create policy hpt_responses_candidate_insert on public.hpt_responses for insert with check(true);
create policy hpt_responses_admin_select on public.hpt_responses for select to authenticated using(public.is_admin());

create index if not exists hpt_attempts_date_idx on public.hpt_attempts(started_at desc);
create index if not exists hpt_hazards_video_idx on public.hpt_hazards(video_id);
create index if not exists hpt_responses_attempt_idx on public.hpt_responses(attempt_id);

-- Optional seed of the 10 currently bundled videos. Run once if these rows are not already present.
insert into public.hpt_videos(clip_code,title,video_path,duration_seconds,active) values
('01','Hazard Perception Clip 01','videos/1.webm',50,true),('02','Hazard Perception Clip 02','videos/2.webm',50,true),('03','Hazard Perception Clip 03','videos/3.webm',50,true),('04','Hazard Perception Clip 04','videos/4.webm',50,true),('05','Hazard Perception Clip 05','videos/5.webm',50,true),('06','Hazard Perception Clip 06','videos/6.webm',50,true),('07','Hazard Perception Clip 07','videos/7.webm',50,true),('08','Hazard Perception Clip 08','videos/8.webm',50,true),('09','Hazard Perception Clip 09','videos/9.webm',50,true),('10','Hazard Perception Clip 10','videos/10.webm',50,true)
on conflict(clip_code) do nothing;

-- Add/edit exact hazard points from Admin; do not blindly overwrite existing annotations here.
