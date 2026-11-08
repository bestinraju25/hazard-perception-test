HPT V122 — SCHOOL HOMEPAGE + ACCESS PORTAL UI REPAIR
====================================================

WHAT THIS FIXES
---------------
1. The public school access portal had display:block!important rules for its scroll layout.
   Those rules overrode the browser's hidden attribute after a successful school login.
   As a result, the public login/registration/Global Top 3 panel could remain visible on
   top of the authenticated school's home screen. V122 explicitly hides #schoolGate when
   its hidden attribute is set, and applies the same safe state rule to the main screens.

2. The access-code card used a pale white background that looked disconnected from the
   cinematic road background. It is now a dark translucent glass panel with a cyan/gold
   edge treatment, dark input, and red primary login button. Registration and recovery
   actions use matching glass styling.

3. The authenticated school home screen now has a cohesive darker glass treatment for
   its statistics, instructions, leaderboard and candidate form. It remains the existing
   school home screen and does not include the public access/login/registration panel.

4. Replaced the broken-looking lock glyph with an inline SVG lock icon.

FILES CHANGED
-------------
- index.html — access-card lock mark only.
- hpt-experience.css — hidden-state fix and visual refinements.
- README-V122-SCHOOL-HOMEPAGE-AND-ACCESS-UI.txt — this note.

NO DATABASE CHANGE
------------------
No SQL migration is required. Existing Supabase access verification, intro leaderboard,
registration/payment, exams, student data, reports, Learner's Mock Test, admin and manager
logic are untouched.

TESTING
-------
1. Open the public page: only the access portal should be visible after the opening intro.
2. Enter an active school's code: the welcome animation should play, then the school home
   screen should appear. The access portal, Get Access Code, Forgot Access Code and public
   Global Top 3 panel must be hidden.
3. Use EXIT: the school home should close and the public access portal should return.
4. Check both desktop and mobile widths.

For Supabase testing, use START-LOCAL-TEST.bat or another localhost HTTP server rather
than file:/// . The archive excludes .git/ and videos/.
