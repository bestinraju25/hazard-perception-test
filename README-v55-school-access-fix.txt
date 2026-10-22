HPT Multi-School Access Flow Fix
================================
Project expected by this build:
  https://nceufqdvuuztdfyesbxx.supabase.co

1) In that Supabase project, open SQL Editor -> New query.
2) Run the complete file 09-fix-school-access-verification.sql.
3) Confirm `access_rpc_exists` and `schools_table_exists` are true.
4) Refresh the local website. index.html bumps app.js to v49 to reduce stale JS cache.
5) Enter the school access code. A valid active code should switch from the access portal to that school's candidate start/home screen.
6) Enter a candidate name and mobile number, then start the exam.

The app now shows the Supabase error detail if access verification still fails, which will help diagnose any remaining project, permission, or schema-cache issue.

The bundled clip fallback was also corrected: local clips now receive the `file` URL used by the video player, so bundled video files can play even when Supabase has no video metadata rows.

Security: only the public publishable key belongs in hpt-config.js. Never put a Supabase secret/service-role key in a browser bundle.
