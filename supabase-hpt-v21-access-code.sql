-- RAJU HPT v21 candidate access-code migration
-- Adds a persistent admin-controlled access code for the candidate HPT.
-- Defensive Driving Seminar tables/functions are not modified.

create table if not exists public.hpt_settings (
  id integer primary key check (id = 1),
  access_code text not null default '1234',
  updated_at timestamptz not null default now()
);

insert into public.hpt_settings(id, access_code)
values (1, '1234')
on conflict (id) do nothing;

alter table public.hpt_settings enable row level security;

drop policy if exists hpt_settings_admin_select on public.hpt_settings;
create policy hpt_settings_admin_select on public.hpt_settings
for select to authenticated using (public.is_admin());

drop policy if exists hpt_settings_admin_update on public.hpt_settings;
create policy hpt_settings_admin_update on public.hpt_settings
for update to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.verify_hpt_access_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
begin
  return exists (
    select 1 from public.hpt_settings
    where id=1 and access_code = coalesce(p_code,'')
  );
end;
$$;

revoke all on function public.verify_hpt_access_code(text) from public;
grant execute on function public.verify_hpt_access_code(text) to anon, authenticated;

-- The candidate can verify the code through the RPC without being able to
-- select the stored code itself. Admins can read/update it through RLS.
