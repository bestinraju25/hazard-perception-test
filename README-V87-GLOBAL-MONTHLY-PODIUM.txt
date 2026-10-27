V87 — GLOBAL MONTHLY TOP THREE PODIUM

WHAT'S NEW
- Adds a Global Top 3 podium to the public school access-code page, below School Login and Register Your School.
- Displays the three highest-scoring students across all active participating driving schools.
- Each podium entry displays the student's privacy-masked name (first name + surname initial), driving school, score / 100, and average reaction time.
- The month caption is dynamic and uses Asia/Kolkata time (e.g. October 2026).
- Rankings refresh on page load, when returning to the access page, and every five minutes while the access page is open.

RANKING RULES
1. Current India calendar month only, based on completed_at.
2. One best attempt per normalized mobile number across the participating schools.
3. Highest score wins.
4. Equal scores are ordered by faster average reaction time for correctly identified hazards.
5. Only schools currently marked active are included.
6. The SQL RPC never returns phone numbers, attempt IDs, or full candidate surnames.

DATABASE STEP (REQUIRED ONCE)
Run 14-global-monthly-top-three-v87.sql in Supabase Dashboard > SQL Editor.
This creates public.hpt_global_monthly_top_three(). It uses SECURITY DEFINER with a fixed search_path and grants the anonymous/public page only access to the three safe display rows. Existing school-specific leaderboard RPC is not modified.

DEPLOY
1. Extract the complete ZIP.
2. Replace the project files in the existing GitHub Pages repository and commit to the publishing branch.
3. Run the SQL migration above once in the same Supabase project configured in hpt-config.js.
4. Open the public access-code page and verify the Global Top 3 podium appears.

No video files need to be re-uploaded. No Edge Function deployment is required. Existing school-only monthly leaderboard, login, exam scoring, provider admin and school reporting remain unchanged.

PRIVACY NOTE
Because this podium is shown before school login, names are intentionally masked to first name + surname initial. Phone numbers and individual attempt records are never shown. Confirm that your schools' student notices/consents cover publication of this limited monthly recognition information.
