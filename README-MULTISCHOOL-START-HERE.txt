RAJU HPT MULTI-SCHOOL BUILD — PROJECT nceufqdvuuztdfyesbxx
======================================================

IMPORTANT: This ZIP is configured for the Supabase project:
  Project reference: nceufqdvuuztdfyesbxx
  API URL: https://nceufqdvuuztdfyesbxx.supabase.co

The Storage S3 endpoint is NOT the API URL. Do not use a URL ending in
.storage.supabase.co/storage/v1/s3 as supabaseUrl.

BEFORE RUNNING THE WEBSITE
1. Open hpt-config.js.
2. The supplied project Publishable key is already configured in hpt-config.js. If you rotate it, replace it with the new Publishable key from THIS project:
   Supabase dashboard -> Project Settings -> API Keys (or Connect -> API keys).
   The key must belong to project nceufqdvuuztdfyesbxx. Do not use a service_role/secret key in browser code.
3. Save hpt-config.js. This is required because publishable keys are project-specific; the key cannot be derived from the project ID.
4. If you use the video publish-to-GitHub feature, deploy the included hpt-publish-video Edge Function to this project and configure its secrets. Ordinary test flow, school access, and logos use the API and Storage.

DATABASE SETUP — RUN IN ORDER
1. Supabase dashboard -> project nceufqdvuuztdfyesbxx -> SQL Editor -> New query.
2. Run the ENTIRE file 01-install-multischool-hpt-nceufqdvuuztdfyesbxx.sql.
   This canonical install creates/updates core HPT tables, manager support, hpt_schools,
   hpt_attempts.school_id and its FK, RPCs, clips/hazards and the hpt-school-logos bucket.
3. Confirm the install query completes without a red error. If it fails, stop and share the FIRST error with line number; a failed transaction rolls back all changes from that query.
4. Ensure the manager email exists under Authentication -> Users in THIS project. Supabase Auth users are not automatically shared between projects. If missing, invite/create rajudrivingschoolckdy@gmail.com here and complete authentication setup.
5. Run the ENTIRE file 02-register-manager-nceufqdvuuztdfyesbxx.sql. It grants active manager status only to that exact email.
6. Run 03-verify-multischool-nceufqdvuuztdfyesbxx.sql. Expected checks are true for attempts_has_school_id, attempts_school_foreign_key_exists, logo_bucket_exists and logo_bucket_is_public; table fields must not be NULL.
7. Restart the local server/browser, then hard-refresh with Ctrl+F5.

DO NOT run old partial repair files or the legacy base SQL migrations on top of this install unless specifically needed. The ZIP retains some legacy version SQL files for historical reference; the three project-specific files above are the only setup sequence for this multi-school package.

DATA SAFETY
The installer uses IF NOT EXISTS and does not intentionally delete HPT tables or attempt records. It updates/replaces HPT policies and RPC definitions needed by the multi-school website. Run only against project nceufqdvuuztdfyesbxx.
