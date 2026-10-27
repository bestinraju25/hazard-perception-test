V85 — MERGED BASELINE: V83 PROVIDER ADMIN + V84 MOBILE BRANDING / MONTHLY LEADERBOARD

This package is built on the complete V83 project. V83 provider administration, school-wise reports/exports, disabled-school messaging, WhatsApp inquiry form, SEO metadata, robots.txt, sitemap.xml, and all existing V83 assets/scripts are retained. V84 changes are selectively merged on top.

RETAINED V83 FEATURES
- Provider-neutral admin sign-in and control centre.
- School registry and per-school enable/disable controls.
- School-filtered candidate results, candidate CSV export and weekly/monthly performance reports.
- Disabled school access message.
- WhatsApp enquiry form collecting driving school name, contact number and location.
- Public wording remains “Hazard Perception Test”; Kerala terms remain in SEO metadata/content without narrowing the visible product identity.
- Existing SEO setup files, robots.txt and sitemap.xml.

MERGED V84 FEATURES
- Mobile school logo and school name displayed in the home introduction area, replacing the generic slogan on mobile.
- Mobile Exit, My Attempts and Fullscreen controls aligned at the right of the top navbar.
- Desktop/laptop two-column homepage layout retained.
- Improved leaderboard heading spacing and responsive typography.
- Leaderboard month label generated dynamically using Asia/Kolkata time.
- Current-month leaderboard; highest score per student/mobile number; average reaction time breaks ties; school-scoped results.

SUPABASE MIGRATIONS
For an existing V83 installation, run both SQL files below once in the same Supabase project, in this order:
1. 11-provider-admin-and-school-status-v83.sql (if not already run). This enables status-aware school access verification.
2. 12-school-leaderboard-monthly-v84.sql. This updates the leaderboard RPC to the current India calendar month.

If migration 11 has already been run successfully, do not rerun it unnecessarily; run migration 12. The updated 10-school-leaderboard-rpc.sql is included for fresh installations and reflects the monthly leaderboard logic.

DEPLOYMENT
1. Extract this complete ZIP.
2. Upload/replace the project files in the existing GitHub Pages repository. Do not delete your repository's separate videos folder if it is maintained outside this package.
3. Commit and push to the publishing branch.
4. Apply the required Supabase migration(s) above.
5. Hard-refresh the public site and admin page.
6. Test: provider admin login, school-wise REPORTS, student CSV, weekly/monthly report export, disable/enable school, WhatsApp enquiry fields, mobile student login, leaderboard month and ranking.

IMPORTANT
- This is a merge of V83 + V84, not a replacement of V83 with the earlier incomplete V84 archive.
- Candidate records, school records, credentials, exam scoring and certificate logic are retained from V83.
- No .git directory is included in the deployment ZIP.
