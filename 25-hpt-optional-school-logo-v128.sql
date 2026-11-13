-- HPT V128: make the driving-school logo optional during public registration.
-- Run once in Supabase SQL Editor for project nceufqdvuuztdfyesbxx.
-- Existing hpt_schools.logo_url values are not changed.

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
  v_logo_url text := nullif(btrim(p_logo_url),'');
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

  -- A custom logo is optional. If supplied, it must be in this project's public-registration folder.
  if v_logo_url is not null
     and left(v_logo_url, length('https://nceufqdvuuztdfyesbxx.supabase.co/storage/v1/object/public/hpt-school-logos/public-registration/'))
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
        btrim(p_school_name), btrim(p_contact_number), btrim(p_location), v_state, v_code, v_logo_url,
        '#ffc400', '#0b1b29', false, 'pending_approval', 'pending_manual_verification', now(), now()
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
    'active', false,
    'has_custom_logo', v_logo_url is not null
  );
end;
$$;

revoke all on function public.register_hpt_school(text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.register_hpt_school(text,text,text,text,text) to anon, authenticated;
notify pgrst, 'reload schema';

-- Verification: this function should exist and school logo_url remains nullable.
select
  to_regprocedure('public.register_hpt_school(text,text,text,text,text)') is not null as optional_logo_registration_rpc_exists,
  (select is_nullable='YES' from information_schema.columns where table_schema='public' and table_name='hpt_schools' and column_name='logo_url') as school_logo_url_is_nullable;
