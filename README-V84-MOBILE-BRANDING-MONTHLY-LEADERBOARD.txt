V84 — MOBILE SCHOOL BRANDING + MONTHLY TOP SCORERS

UI changes
----------
- Mobile school home navbar now shows Exit, My Attempts and Fullscreen icons aligned at the far right.
- On mobile candidate home, the large school logo, school name and HAZARD PERCEPTION TEST line are displayed in the home intro area where the generic "See the hazard. Respond in time." heading used to appear.
- The mobile school logo/name are populated from the verified active school's branding fields.
- The generic header brand is hidden on the authenticated mobile home only; desktop and school-access screen header branding remain unchanged.
- Desktop two-column layout remains unchanged.
- Desktop leaderboard title has stronger spacing, line-height and typography so it no longer appears cramped or overlapped.

Monthly leaderboard
-------------------
- Top Scorers Spotlight now displays the current month in brackets, e.g. (October).
- Month label is generated dynamically using Asia/Kolkata time.
- Leaderboard RPC now includes only completed examinations within the current India calendar month.
- For each student/mobile number, only their highest score in that month is included.
- Equal scores continue to be ordered by faster average reaction time.
- Rankings remain limited to the currently authenticated school.

REQUIRED SUPABASE STEP
----------------------
The leaderboard's monthly date filter is implemented in SQL. Run this migration once in the same Supabase project:

  12-school-leaderboard-monthly-v84.sql

The file 10-school-leaderboard-rpc.sql has also been updated for clean/fresh setup, but for an already-running project use migration 12. It uses CREATE OR REPLACE FUNCTION and does not delete candidate data or change existing school records.

DEPLOY
------
1. Extract the full ZIP.
2. Upload/replace the complete project files in the existing GitHub Pages repository and commit to the publishing branch.
3. In Supabase Dashboard > SQL Editor, execute 12-school-leaderboard-monthly-v84.sql once.
4. Refresh the school homepage on mobile and desktop. If CSS is cached, clear the mobile browser cache or reload the site.

No new Edge Function deployment is required. No existing exam scoring, school access-code logic, student data, candidate reports or certificates are intentionally changed.
