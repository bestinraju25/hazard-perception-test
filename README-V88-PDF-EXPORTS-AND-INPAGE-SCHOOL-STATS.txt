V88 — DESIGNED PDF EXPORTS + IN-PAGE SCHOOL STATISTICS

1. Provider Admin exports
-------------------------
- Student CSV export has been replaced by a designed Student PDF.
- Weekly/monthly CSV performance export has been replaced by a designed Performance PDF.
- Both reports are generated with the jsPDF library already loaded by admin.html.
- Report design includes a dark navy/gold branded header, school logo where the supplied logo_url is accessible, school name, generated timestamp, KPI summary cards, clean tables, alternating row backgrounds and page footers.
- If a school logo URL cannot be loaded because the image host blocks cross-origin canvas access, the report falls back to an HPT brand mark.
- Student PDF includes date/time, candidate, phone, score and pass/fail result for the selected school's current filters.
- Performance PDF includes KPI cards, an attempts/passed bar chart, and weekly/monthly period summary table.
- Multi-page reports repeat the school header/logo.

2. School Stats button
----------------------
- Clicking SCHOOL STATS no longer opens school-stats.html in a new tab.
- It opens a modal overlay on the same school homepage.
- The existing tab and fullscreen state are kept; no window.open() or page navigation is used.
- The modal closes through the close button, backdrop or Escape key.
- Displays lifetime registered students, completed attempts, pass count, fail count, average score, plus a separate current-month attempt count.
- Includes a pass-rate ring and passed-vs-failed horizontal comparison bars.
- The stats function returns aggregate results only for the active school matching the access code; it does not expose student names, mobile numbers or per-attempt records.

3. Required Supabase migration
------------------------------
Run once in the same Supabase project:
  15-school-dashboard-stats-pdf-v88.sql

This adds hpt_school_dashboard_stats. It does not update/delete candidate records, school records, video records or scoring rules.

4. Deployment
-------------
- Replace/update the complete project files in the existing GitHub Pages repository and commit to the configured publishing branch.
- Run the SQL migration once in Supabase Dashboard > SQL Editor.
- On a school homepage, click SCHOOL STATS. The overview should appear as an in-page popup without exiting fullscreen or opening a new tab.
- In Provider Admin > Candidates & Results > a school's records, test Download Student PDF and Download Performance PDF.

School logo note:
The PDF attempts to load the school logo from the configured school logo_url. The image host must allow cross-origin image loading for embedding; otherwise the report uses a neutral HPT mark fallback.

No Edge Function deployment is required. Keep the existing GitHub videos/ folder and do not delete it during deployment.
