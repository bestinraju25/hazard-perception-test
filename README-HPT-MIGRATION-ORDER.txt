RAJU HPT MULTI-SCHOOL MIGRATION — IMPORTANT EXECUTION ORDER

Why this extra first step exists
The error `relation "public.hpt_attempts" does not exist` means the SQL query being executed references the result table before it is present in the selected schema. The full multi-school migration defines this table, but running a selected/later section or an older add-on migration can still produce the error.

1. In Supabase, open SQL Editor and choose New query.
2. Open 00-hpt-core-tables-bootstrap.sql. Copy its ENTIRE contents into that new query and click Run.
3. Verify the result grid at the bottom shows public.hpt_videos, public.hpt_hazards, public.hpt_attempts and public.hpt_responses (none should be NULL).
4. Open another New query. Open supabase-hpt-multischool-migration-v2.sql. Copy the ENTIRE file from the first comment to the final COMMIT and click Run. Make sure no text selection is active in the editor when clicking Run.
5. Only after the migration succeeds, run supabase-hpt-multischool-bootstrap-manager.sql and replace CHANGE-THIS with the email of the intended existing Supabase Auth manager account.

Do not run the old `supabase-hpt-v13-results.sql`, `supabase-hpt-v14-candidate-history.sql`, or other incremental HPT SQL scripts instead of the complete multi-school migration. Those are add-on scripts and assume the base HPT tables already exist.

This setup does not drop existing tables. As with any database migration, review errors before retrying and do not delete production data to resolve a missing-table error.


Learner's Mock Test + Student Profile (V100)
After the complete base HPT multi-school schema is already installed, run `16-learner-test-and-student-profile.sql` in the same Supabase project. This additive migration adds `learner_score` to `hpt_attempts`, creates the school-scoped `hpt_learner_attempts` history table and installs the school access-code-validated RPCs used by Learner's Mock Test and Student Profile. Do not run it before the base `hpt_schools`, `hpt_attempts` and `hpt_responses` tables exist. Back up the project first and review any SQL error before retrying.
