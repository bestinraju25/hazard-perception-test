-- HPT MULTI-SCHOOL: ACCESS CODE VERIFICATION RPC REPAIR
-- Run in the SQL Editor of the same Supabase project configured in hpt-config.js.
-- This is intentionally standalone; do not re-run the full installer just to repair access verification.

begin;
create extension if not exists pgcrypto;

-- Ensure the school registry exists and contains every field used by the manager and portal.
create table if not exists public.hpt_schools (
  id uuid primary key default gen_random_uuid(),
  school_name text not null,
  contact_number text not null default '',
  location text not null default '',
  access_code text not null,
  logo_url text,
  brand_color text not null default '#ffc400',
  dark_color text not null default '#0b1b29',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.hpt_schools add column if not exists school_name text not null default 'Driving School';
alter table public.hpt_schools add column if not exists contact_number text not null default '';
alter table public.hpt_schools add column if not exists location text not null default '';
alter table public.hpt_schools add column if not exists access_code text not null default '';
alter table public.hpt_schools add column if not exists logo_url text;
alter table public.hpt_schools add column if not exists brand_color text not null default '#ffc400';
alter table public.hpt_schools add column if not exists dark_color text not null default '#0b1b29';
alter table public.hpt_schools add column if not exists active boolean not null default true;
alter table public.hpt_schools add column if not exists created_at timestamptz not null default now();
alter table public.hpt_schools add column if not exists updated_at timestamptz not null default now();

-- SECURITY DEFINER lets candidates verify one code without granting public reads to the school table.
create or replace function public.verify_hpt_school_access_code(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', s.id,
    'school_name', s.school_name,
    'contact_number', s.contact_number,
    'location', s.location,
    'logo_url', s.logo_url,
    'brand_color', s.brand_color,
    'dark_color', s.dark_color
  )
  from public.hpt_schools as s
  where s.active = true
    and nullif(trim(coalesce(p_code, '')), '') is not null
    and lower(trim(s.access_code)) = lower(trim(p_code))
  order by s.created_at asc
  limit 1;
$$;

revoke all on function public.verify_hpt_school_access_code(text) from public;
grant execute on function public.verify_hpt_school_access_code(text) to anon, authenticated;
grant usage on schema public to anon, authenticated;

-- Add the school link to attempts if the existing HPT table is present.
do $$
begin
  if to_regclass('public.hpt_attempts') is not null then
    alter table public.hpt_attempts add column if not exists school_id uuid;
    if not exists (
      select 1 from pg_constraint
      where conname = 'hpt_attempts_school_id_fkey'
        and conrelid = 'public.hpt_attempts'::regclass
    ) then
      alter table public.hpt_attempts
        add constraint hpt_attempts_school_id_fkey
        foreign key (school_id) references public.hpt_schools(id) on delete set null;
    end if;
    create index if not exists hpt_attempts_school_date_idx
      on public.hpt_attempts(school_id, started_at desc);
  end if;
end $$;

notify pgrst, 'reload schema';
commit;

-- Verification: this should return the function signature and table/column presence.
select
  to_regprocedure('public.verify_hpt_school_access_code(text)') is not null as access_rpc_exists,
  to_regclass('public.hpt_schools') is not null as schools_table_exists,
  case when to_regclass('public.hpt_attempts') is null then false else exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='hpt_attempts' and column_name='school_id'
  ) end as attempts_has_school_id,
  (select count(*) from public.hpt_schools where active = true) as active_school_count;
