-- HPT GLOBAL MAINTENANCE MODE
-- Run once in Supabase SQL Editor for project nceufqdvuuztdfyesbxx.
-- Public users can read only this non-sensitive status row. Only active provider admins can update it.

create table if not exists public.hpt_site_status (
  id integer primary key default 1 check (id = 1),
  maintenance_enabled boolean not null default false,
  maintenance_title text not null default 'We’ll be back soon!',
  maintenance_message text not null default 'Our server is currently under maintenance. We are making a few improvements and will be back shortly. Thank you for your patience.',
  updated_at timestamptz not null default now(),
  constraint hpt_site_status_title_length check (char_length(maintenance_title) between 1 and 100),
  constraint hpt_site_status_message_length check (char_length(maintenance_message) between 1 and 500)
);

insert into public.hpt_site_status (id, maintenance_enabled, maintenance_title, maintenance_message)
values (
  1,
  false,
  'We’ll be back soon!',
  'Our server is currently under maintenance. We are making a few improvements and will be back shortly. Thank you for your patience.'
)
on conflict (id) do nothing;

alter table public.hpt_site_status enable row level security;
revoke all on public.hpt_site_status from anon, authenticated;
grant select on public.hpt_site_status to anon, authenticated;
grant update on public.hpt_site_status to authenticated;

drop policy if exists hpt_site_status_public_read on public.hpt_site_status;
create policy hpt_site_status_public_read
  on public.hpt_site_status
  for select
  to anon, authenticated
  using (true);

drop policy if exists hpt_site_status_admin_update on public.hpt_site_status;
create policy hpt_site_status_admin_update
  on public.hpt_site_status
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- No INSERT or DELETE permissions/policies are granted. The one fixed row is managed by the Admin UI.
