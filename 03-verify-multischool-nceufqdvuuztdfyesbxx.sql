-- VERIFY MULTI-SCHOOL SCHEMA IN PROJECT nceufqdvuuztdfyesbxx
-- Run after the install SQL. All boolean checks should return true; the two table names should not be NULL.
SELECT
  current_database() AS database_name,
  to_regclass('public.hpt_schools') AS schools_table,
  to_regclass('public.hpt_attempts') AS attempts_table,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='hpt_attempts' AND column_name='school_id'
  ) AS attempts_has_school_id,
  EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attname='school_id' AND NOT a.attisdropped
    JOIN pg_attribute s ON s.attrelid=c.confrelid AND s.attname='id' AND NOT s.attisdropped
    WHERE c.contype='f' AND c.conrelid='public.hpt_attempts'::regclass
      AND c.confrelid='public.hpt_schools'::regclass
      AND c.conkey=ARRAY[a.attnum]::smallint[] AND c.confkey=ARRAY[s.attnum]::smallint[]
  ) AS attempts_school_foreign_key_exists,
  EXISTS (SELECT 1 FROM storage.buckets WHERE id='hpt-school-logos') AS logo_bucket_exists,
  EXISTS (SELECT 1 FROM storage.buckets WHERE id='hpt-school-logos' AND public=true) AS logo_bucket_is_public;
