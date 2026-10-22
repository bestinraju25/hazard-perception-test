-- REGISTER THE EXISTING MANAGER USER IN TARGET PROJECT nceufqdvuuztdfyesbxx
-- Run this only AFTER 01-install-multischool-hpt-nceufqdvuuztdfyesbxx.sql succeeds.
-- If no row is found in auth.users, first create/invite this user in Supabase Authentication > Users.
-- This does NOT create/reset a password and grants manager rights only to the exact email below.

DO $$
DECLARE
  target_user_id uuid;
  target_email text := 'rajudrivingschoolckdy@gmail.com';
BEGIN
  SELECT u.id INTO target_user_id
  FROM auth.users AS u
  WHERE lower(u.email) = lower(target_email)
  ORDER BY u.created_at
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'No Supabase Auth user exists for %. Create/invite this email under Authentication > Users in project nceufqdvuuztdfyesbxx, then run this query again.', target_email;
  END IF;

  INSERT INTO public.admin_users (id, full_name, email, active)
  VALUES (target_user_id, 'RAJU HPT Manager', target_email, true)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        active = true;
END $$;

SELECT au.id, au.email, au.active
FROM public.admin_users AS au
WHERE lower(au.email) = lower('rajudrivingschoolckdy@gmail.com');
