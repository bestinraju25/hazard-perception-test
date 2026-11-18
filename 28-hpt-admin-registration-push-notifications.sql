-- HPT V134: focused school approval queue support and provider-admin Web Push subscriptions.
-- Run this after migrations 19 and 27. Existing schools and student/exam data are preserved.

begin;

-- Track whether a registration has already generated its one-time notification.
alter table public.hpt_schools
  add column if not exists registration_notification_sent_at timestamptz;

-- New/previously default disabled-school messages include the provider contact number.
alter table public.hpt_schools
  alter column disabled_message set default
  'This driving school’s access is temporarily disabled. For any queries, please contact Bestin Raju on 8943764734.';

update public.hpt_schools
   set disabled_message = 'This driving school’s access is temporarily disabled. For any queries, please contact Bestin Raju on 8943764734.'
 where disabled_message is null
    or length(trim(disabled_message)) = 0
    or disabled_message = 'This driving school’s access is temporarily disabled. Please contact your school administrator for assistance.';

create table if not exists public.hpt_admin_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hpt_admin_push_subscriptions_user_idx
  on public.hpt_admin_push_subscriptions(user_id);

alter table public.hpt_admin_push_subscriptions enable row level security;
revoke all on public.hpt_admin_push_subscriptions from public, anon;
grant select, insert, update, delete on public.hpt_admin_push_subscriptions to authenticated;

drop policy if exists hpt_admin_push_select_own_admin on public.hpt_admin_push_subscriptions;
drop policy if exists hpt_admin_push_insert_own_admin on public.hpt_admin_push_subscriptions;
drop policy if exists hpt_admin_push_update_own_admin on public.hpt_admin_push_subscriptions;
drop policy if exists hpt_admin_push_delete_own_admin on public.hpt_admin_push_subscriptions;

create policy hpt_admin_push_select_own_admin
  on public.hpt_admin_push_subscriptions for select to authenticated
  using (user_id = auth.uid() and exists (
    select 1 from public.admin_users a where a.id = auth.uid() and a.active = true
  ));

create policy hpt_admin_push_insert_own_admin
  on public.hpt_admin_push_subscriptions for insert to authenticated
  with check (user_id = auth.uid() and exists (
    select 1 from public.admin_users a where a.id = auth.uid() and a.active = true
  ));

create policy hpt_admin_push_update_own_admin
  on public.hpt_admin_push_subscriptions for update to authenticated
  using (user_id = auth.uid() and exists (
    select 1 from public.admin_users a where a.id = auth.uid() and a.active = true
  ))
  with check (user_id = auth.uid() and exists (
    select 1 from public.admin_users a where a.id = auth.uid() and a.active = true
  ));

create policy hpt_admin_push_delete_own_admin
  on public.hpt_admin_push_subscriptions for delete to authenticated
  using (user_id = auth.uid() and exists (
    select 1 from public.admin_users a where a.id = auth.uid() and a.active = true
  ));

notify pgrst, 'reload schema';
commit;

-- Verification: expected values are true / present after the migration.
select
  exists (select 1 from information_schema.columns where table_schema='public' and table_name='hpt_schools' and column_name='registration_notification_sent_at') as notification_tracking_column_exists,
  to_regclass('public.hpt_admin_push_subscriptions') is not null as admin_push_subscriptions_table_exists,
  (select column_default from information_schema.columns where table_schema='public' and table_name='hpt_schools' and column_name='disabled_message') as disabled_message_default;
