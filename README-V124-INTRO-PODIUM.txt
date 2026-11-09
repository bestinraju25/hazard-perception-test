HPT V124 — CINEMATIC INTRO PODIUM UPDATE
========================================

WHAT CHANGED
------------
- The opening intro now shows a podium-style live Top 3 while the single progress
  bar runs at the bottom of the screen.
- Removed repeated/overlapping loading messages and the older SEE / IDENTIFY / REACT
  pillar row from the splash screen.
- Added a short motivation message encouraging learners to earn a place in the
  monthly Global Top 5.
- The podium reads the top three rows from the existing public-safe
  hpt_global_monthly_top_ten() RPC. It only receives masked display names, school
  names and scores; no phone numbers or internal IDs are exposed to the browser.
- If the month has no completed tests, the opening says the podium is open. If the
  RPC fails, it shows a clear unavailable message rather than inventing students.
- The Top 5 table on the landing page remains unchanged.
- Progress is a single continuous animation at the bottom and runs independently
  of the leaderboard request, with reduced-motion support.
- Responsive styling has been added for desktop, tablets, portrait phones, narrow
  screens and short-height displays.

INSTALL / DEPLOY
----------------
This ZIP contains the complete site folder. Replace your previous V123 clone with
this folder after making a backup. No new SQL migration is introduced.

If V123 is already running and migration 22-global-monthly-top-ten.sql was already
run successfully, do NOT run it again. If it was never run, apply that migration
once in the same Supabase project before publishing.

TEST
----
1. Open the site through START-LOCAL-TEST.bat (not file://).
2. Observe that the intro has one progress line/bar at the bottom.
3. Confirm that the Top 3 podium shows real current-month records after Supabase
   returns them. If there are no records, it must show the empty podium message.
4. Skip intro and verify the school access page still appears.
5. Log in with a valid school code and verify the school welcome overlay and portal.

The existing exam scoring, candidate records, registration, payments, admin, manager,
reports, school Top 5 and Learner's Mock Test are not intentionally changed.
