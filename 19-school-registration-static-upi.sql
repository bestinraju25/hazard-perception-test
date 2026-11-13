-- HPT V117: Self-service driving-school registration, manual payment approval and access-code recovery
-- Run once in Supabase SQL Editor for the project configured in hpt-config.js.
-- Existing HPT schools, attempts, videos, reports and manager accounts are not deleted or rewritten.

begin;
create extension if not exists pgcrypto;

-- Existing schools are treated as already approved. New public registrations explicitly set pending statuses.
alter table public.hpt_schools
  add column if not exists registration_status text not null default 'approved';
alter table public.hpt_schools
  add column if not exists payment_status text not null default 'not_required';
alter table public.hpt_schools
  add column if not exists payment_confirmed_at timestamptz;

alter table public.hpt_schools
  drop constraint if exists hpt_schools_registration_status_check;
alter table public.hpt_schools
  add constraint hpt_schools_registration_status_check
  check (registration_status in ('pending_approval','approved','rejected'));

alter table public.hpt_schools
  drop constraint if exists hpt_schools_payment_status_check;
alter table public.hpt_schools
  add constraint hpt_schools_payment_status_check
  check (payment_status in ('pending_manual_verification','customer_confirmed','verified','not_required'));

-- The original multi-school installer already enforces unique access codes.
-- The existing bucket is created by the original multi-school installer. Ensure it remains public
-- for logo display while permitting anonymous uploads only into the public-registration/ folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('hpt-school-logos','hpt-school-logos',true,5242880,
        array['image/png','image/jpeg','image/webp','image/svg+xml'])
on conflict (id) do update
set public = true,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/png','image/jpeg','image/webp','image/svg+xml'];

drop policy if exists hpt_school_logos_public_registration_insert on storage.objects;
create policy hpt_school_logos_public_registration_insert
  on storage.objects for insert to anon
  with check (
    bucket_id = 'hpt-school-logos'
    and (storage.foldername(name))[1] = 'public-registration'
    and lower(storage.extension(name)) in ('png','jpg','jpeg','webp')
  );

-- Creates a disabled school and a unique four-digit code. School logo is optional; NULL uses the HPT platform logo. It does NOT activate school access.
create or replace function public.register_hpt_school(
  p_school_name text,
  p_location text,
  p_contact_number text,
  p_logo_url text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_school_id uuid;
  v_contact_digits text;
  v_attempt integer := 0;
begin
  v_contact_digits := regexp_replace(coalesce(p_contact_number,''), '\D', '', 'g');
  if length(trim(coalesce(p_school_name,''))) < 2
     or length(trim(coalesce(p_location,''))) < 2
     or length(v_contact_digits) < 10
     or length(v_contact_digits) > 15 then
    raise exception 'Enter a valid school name, location and contact number.';
  end if;

  if p_logo_url is not null
     and left(p_logo_url, length('https://nceufqdvuuztdfyesbxx.supabase.co/storage/v1/object/public/hpt-school-logos/public-registration/'))
        <> 'https://nceufqdvuuztdfyesbxx.supabase.co/storage/v1/object/public/hpt-school-logos/public-registration/' then
    raise exception 'Please upload a valid driving school logo.';
  end if;

  loop
    v_code := lpad(floor(random() * 10000)::integer::text, 4, '0');
    begin
      insert into public.hpt_schools (
        school_name, contact_number, location, access_code, logo_url,
        brand_color, dark_color, active, registration_status, payment_status,
        created_at, updated_at
      ) values (
        trim(p_school_name), trim(p_contact_number), trim(p_location), v_code, p_logo_url,
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
    'registration_status', 'pending_approval',
    'active', false
  );
end;
$$;


-- The customer button records only that the customer says payment is complete.
-- It does not verify receipt and never activates the school.
create or replace function public.confirm_hpt_school_payment(p_school_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
begin
  update public.hpt_schools
     set payment_status = 'customer_confirmed',
         payment_confirmed_at = now(),
         updated_at = now()
   where id = p_school_id
     and active = false
     and registration_status = 'pending_approval';
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    return jsonb_build_object('ok', false, 'message', 'Registration is not awaiting payment confirmation.');
  end if;
  return jsonb_build_object('ok', true, 'status', 'customer_confirmed');
end;
$$;

-- Direct lookup without OTP is intentionally enabled as requested. It only returns schools matching
-- the exact normalized registered mobile number; it never exposes the full school registry.
create or replace function public.recover_hpt_school_access_code(p_contact_number text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone_digits text;
  v_matches jsonb;
begin
  v_phone_digits := regexp_replace(coalesce(p_contact_number,''), '\D', '', 'g');
  if length(v_phone_digits) < 10 or length(v_phone_digits) > 15 then
    return jsonb_build_object('found', false, 'schools', '[]'::jsonb);
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'school_name', s.school_name,
      'access_code', s.access_code,
      'active', s.active,
      'registration_status', s.registration_status
    ) order by s.created_at desc
  ) into v_matches
  from public.hpt_schools s
  where regexp_replace(coalesce(s.contact_number,''), '\D', '', 'g') = v_phone_digits;

  if v_matches is null then
    return jsonb_build_object('found', false, 'schools', '[]'::jsonb);
  end if;
  return jsonb_build_object('found', true, 'schools', v_matches);
end;
$$;

revoke all on function public.register_hpt_school(text,text,text,text) from public, anon, authenticated;
revoke all on function public.recover_hpt_school_access_code(text) from public, anon, authenticated;
revoke all on function public.confirm_hpt_school_payment(uuid) from public, anon, authenticated;
grant execute on function public.register_hpt_school(text,text,text,text) to anon, authenticated;
grant execute on function public.recover_hpt_school_access_code(text) to anon, authenticated;
grant execute on function public.confirm_hpt_school_payment(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
commit;

-- Verification: confirms that both public RPCs and the two status columns now exist.
select
  to_regprocedure('public.register_hpt_school(text,text,text,text)') is not null as school_registration_rpc_exists,
  to_regprocedure('public.recover_hpt_school_access_code(text)') is not null as access_code_recovery_rpc_exists,
  to_regprocedure('public.confirm_hpt_school_payment(uuid)') is not null as payment_confirmation_rpc_exists,
  exists (select 1 from information_schema.columns where table_schema='public' and table_name='hpt_schools' and column_name='registration_status') as registration_status_column_exists,
  exists (select 1 from information_schema.columns where table_schema='public' and table_name='hpt_schools' and column_name='payment_status') as payment_status_column_exists;
