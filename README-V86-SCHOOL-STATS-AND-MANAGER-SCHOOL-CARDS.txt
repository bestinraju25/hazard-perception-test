V86 — LIFETIME SCHOOL STATISTICS + SCHOOL-CARD PROVIDER MANAGER

A. School homepage: lifetime statistics window
------------------------------------------------
- Added a SCHOOL STATS button to the school homepage navbar controls.
- Opens school-stats.html in a new browser tab/window.
- The active school access code is passed in a URL fragment (not a query parameter) and removed from the address bar immediately by the stats page.
- The stats page calls the hpt_school_lifetime_stats Supabase RPC.
- Displays:
  * Registered students: distinct normalized mobile numbers (fallback to candidate name/attempt ID if no phone number exists).
  * Total completed attempts.
  * Passed attempts: isPassed-compatible rule (passed=true OR score >= 60).
  * Failed attempts: remaining completed attempts.
- All counts cover the lifetime of the school, without monthly/date limits.
- The RPC returns aggregate counts and school name only, not student names, phone numbers or attempt-level data.
- The RPC returns data only for an active school matched by the supplied access code.

B. Provider manager: school-card-first results
-----------------------------------------------
- Candidates & Results now opens with one card per registered school.
- Each card displays lifetime unique students, attempts, passed and failed totals, plus school active/disabled status.
- VIEW STUDENTS & RESULTS opens only that school's candidate list.
- The detail view retains search, date and pass/fail filters, candidate VIEW/REPORT/PRINT/DELETE actions, CSV export and weekly/monthly performance report exports.
- Back to All Schools returns to the card directory.
- Driving Schools registry action has been renamed from REPORTS to VIEW STUDENTS.

C. Required Supabase migration
------------------------------
Run once in Supabase Dashboard > SQL Editor:

  13-school-lifetime-statistics-rpc-v86.sql

This creates the hpt_school_lifetime_stats RPC. It does not alter or delete existing candidate attempts, schools, videos or scoring rules.

D. Deployment
-------------
1. Extract the complete ZIP.
2. Upload/replace the project files in the existing GitHub Pages repository and commit to the current publishing branch.
3. Run migration 13 above once in the Supabase project used by the website.
4. Open a school homepage with an active access code and use SCHOOL STATS.
5. Open Admin > Candidates & Results and confirm the school card overview appears.
6. Select VIEW STUDENTS & RESULTS on a school card; use Back to All Schools to return.

No Edge Function deployment is required. Existing V83/V84 migrations and previous data remain in place.
