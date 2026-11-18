-- V133: custom per-school disabled-access message.
-- Run once in Supabase SQL Editor. Existing schools receive a sensible default.

alter table public.hpt_schools
  add column if not exists disabled_message text not null default 'This driving school’s access is temporarily disabled. Please contact your school administrator for assistance.';

update public.hpt_schools
   set disabled_message = 'This driving school’s access is temporarily disabled. Please contact your school administrator for assistance.'
 where disabled_message is null or length(trim(disabled_message)) = 0;

alter table public.hpt_schools
  drop constraint if exists hpt_schools_disabled_message_length_check;
alter table public.hpt_schools
  add constraint hpt_schools_disabled_message_length_check
  check (char_length(disabled_message) between 1 and 500);

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
   where lower(trim(access_code)) = lower(trim(coalesce(p_code, '')))
   limit 1;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if not v_school.active then
    return jsonb_build_object(
      'status', 'disabled',
      'school_name', v_school.school_name,
      'message', coalesce(nullif(trim(v_school.disabled_message), ''), 'This driving school’s access is temporarily disabled. Please contact your school administrator for assistance.')
    );
  end if;

  return jsonb_build_object(
    'status', 'active',
    'school', jsonb_build_object(
      'id', v_school.id,
      'school_name', v_school.school_name,
      'contact_number', v_school.contact_number,
      'location', v_school.location,
      'state', coalesce(nullif(to_jsonb(v_school)->>'state', ''), 'Kerala'),
      'logo_url', v_school.logo_url,
      'brand_color', v_school.brand_color,
      'dark_color', v_school.dark_color
    )
  );
end;
$$;

revoke all on function public.verify_hpt_school_access_code(text) from public;
grant execute on function public.verify_hpt_school_access_code(text) to anon, authenticated;

notify pgrst, 'reload schema';

select column_name, data_type, is_nullable, column_default
  from information_schema.columns
 where table_schema='public' and table_name='hpt_schools' and column_name='disabled_message';
