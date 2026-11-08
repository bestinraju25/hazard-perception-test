HAZARD PERCEPTION TEST — PREMIUM EXPERIENCE UPDATE
===================================================

This is a full updated website folder based on the ZIP you supplied. The existing
HPT app, registration/payment flow, exam, Learner's Mock Test, reports, manager,
question image assets and audio files are retained.

WHAT HAS BEEN FIXED / ADDED
---------------------------
1. The previous package had the responsive intro CSS but not the matching intro
   markup/JavaScript. This update includes all three, so the opening sequence runs.
2. A fresh page load plays:
   - HPT cinematic loading intro (~2 seconds)
   - Monthly Global Champion (~2.7 seconds)
   - Global Top 10 (~4.2 seconds)
   Each intro scene has Skip Intro.
3. Champion and Top 10 use actual Supabase data. No example names or scores are
   embedded in the production code. If the RPC fails or there are no monthly
   results, the screen displays an honest empty/unavailable message.
4. The Top 10 RPC follows the existing Top 3 rules: Asia/Kolkata month, active
   schools only, best completed score per normalized student mobile, and average
   correct-response reaction time as the tie-break. Only masked display name,
   school name, score and average reaction time are returned publicly.
5. After a valid access code is verified, a personalised school welcome/loading
   screen displays the school's real name, location and logo (when present), then
   transitions to the existing candidate/test screen.
6. The landing page has been simplified around the 4-digit school access code.
   Registration and Forgot Access Code remain available as secondary actions.
7. Includes locally stored desktop and portrait road backgrounds, a vector HPT
   mark and local SVG trophy/school/shield/road icons. No external image CDN is
   needed for these elements.
8. Respects prefers-reduced-motion and adapts to desktop and phone layouts.

INSTALL / DEPLOY
----------------
1. Extract this ZIP. Open the folder named `hazard-perception-test`.
2. Commit/publish the folder contents to the same GitHub repository/Pages source
   you currently use. Do not replace the Supabase project or its configuration.
3. In the Supabase Dashboard for the same HPT project, open SQL Editor and run
   `22-global-monthly-top-ten.sql` once. This adds only the public-safe Top 10 RPC;
   it does not alter attempts, responses, scores, schools or the current Top 3 RPC.
4. Open the deployed website and hard-refresh once (Ctrl+F5) to bypass cached CSS/JS.

LOCAL TESTING ON WINDOWS
------------------------
Do not open `index.html` by double-clicking it (file:///...) when checking
Supabase-backed features. Use the included `START-LOCAL-TEST.bat` instead, or run:

  py -m http.server 8000

Then open http://localhost:8000/ in your browser. The local server avoids the
opaque file:// origin which can cause browser restrictions for API requests.

IMPORTANT NOTES
---------------
- The ZIP intentionally excludes `.git/` and `videos/` as requested previously.
  Your existing video library can stay in GitHub/your separate video storage.
- The uploaded source ZIP already contained no video files; all other supplied
  files (including learner-question-assets, audio, fonts, registration assets,
  admin/manager files and SQL history) were retained.
- Existing HPT scoring and candidate result persistence have not been changed.
- The school welcome is called only after the existing access-code verification
  returns a valid active school. Invalid/disabled codes keep the existing error
  handling and do not show a success animation.
- Run the Top 10 SQL migration before expecting real champion/leaderboard rows.
