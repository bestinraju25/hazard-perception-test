-- V83: Provider-neutral school access status + admin reporting prerequisites.
-- Run once in Supabase SQL Editor after the existing multi-school migrations.

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
      'message', 'Hazard Perception Test Disabled. Please contact the provider to continue using the software.'
    );
  end if;

  return jsonb_build_object(
    'status', 'active',
    'school', jsonb_build_object(
      'id', v_school.id,
      'school_name', v_school.school_name,
      'contact_number', v_school.contact_number,
      'location', v_school.location,
      'logo_url', v_school.logo_url,
      'brand_color', v_school.brand_color,
      'dark_color', v_school.dark_color
    )
  );
end;
$$;

revoke all on function public.verify_hpt_school_access_code(text) from public;
grant execute on function public.verify_hpt_school_access_code(text) to anon, authenticated;

-- Indexes support school-specific and date-range result filtering in the provider dashboard.
alter table public.hpt_attempts add column if not exists school_id uuid;
create index if not exists hpt_attempts_school_completed_idx
  on public.hpt_attempts(school_id, completed_at desc);
create index if not exists hpt_attempts_phone_school_idx
  on public.hpt_attempts(school_id, phone);
