HPT V123 — SINGLE INTRO + GLOBAL TOP 5
======================================

WHAT CHANGED
------------
1. The separate Monthly Global Champion screen has been removed.
2. The separate Global Top 10 intro screen has been removed.
3. A single cinematic loading screen now plays once on each fresh page load, with one progress bar and a Skip Intro control. It runs for about 2.45 seconds (shorter with reduced-motion accessibility enabled).
4. The public landing page now shows a compact Global Top 5 leaderboard instead of the old Top 3 podium.
5. The leaderboard uses real Supabase rows and only shows masked student names, driving school and score.

LEADERBOARD DATA
----------------
The landing Top 5 calls the existing public-safe RPC:
  public.hpt_global_monthly_top_ten()
This RPC is supplied in 22-global-monthly-top-ten.sql. It applies the current India calendar month, active schools, one best score per student and average correct-response reaction time as tie-breaker. No phone numbers or internal IDs are returned.

If migration 22 has already been run in the connected Supabase project, no SQL action is needed. Otherwise run 22-global-monthly-top-ten.sql once in the Supabase SQL Editor, then refresh the website.

UNCHANGED
---------
- School access-code verification and disabled-school handling
- School registration, QR payment and Forgot Access Code
- Post-login personalised school welcome animation
- HPT candidate details, scoring and exam flow
- Learner's Mock Test, student profiles, reports and certificates
- Admin and school manager functions

TESTING
-------
Test in a local web server (not by double-clicking index.html with file://). Use START-LOCAL-TEST.bat. Confirm that the intro disappears after the single progress bar, the landing page displays five real entries when available, and a successful school login still shows the school welcome animation before the school home screen.
