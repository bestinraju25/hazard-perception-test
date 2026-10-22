HPT Multi-School — v57 Startup/Loading Fix
==========================================

Root cause fixed
----------------
The previous app.js assigned changeSchoolBtn.onclick = changeSchool, but changeSchool was never declared. That raised a ReferenceError while the script was initializing, so the code never reached startLoadingScreen(); the HTML loading overlay remained at 0% and the rest of the buttons were not wired up.

Changes
-------
- Implemented changeSchool() so a user can return to the access-code portal safely.
- Replaced fragile top-level DOM event wiring with a guarded binder. Missing optional nodes are logged rather than aborting all app initialization.
- Made saved-school session restoration accept both a single object and a one-row array from Supabase.
- Added a startup watchdog to index.html so a future startup exception cannot leave the loading overlay permanently visible.
- Updated the app script cache version to v57.
- Kept the configured project URL and browser publishable key in hpt-config.js. No secret/service-role key is embedded.

Install/test
------------
1. Extract this ZIP into a new folder; do not mix it with an older extracted copy.
2. Best local testing path: open a terminal in the folder that contains the `hazard-perception-tests` directory and run `py -m http.server 8080` (if Python is installed).
3. Browse to http://localhost:8080/hazard-perception-tests/ . If using direct file opening, it should now avoid the stuck loader too, but localhost is a more reliable environment for local web apps.
4. Confirm loader progresses and disappears, enter a valid school access code, confirm the school's branding and Candidate Details home screen appear, then start a test and verify the first video plays.
5. If access code verification still errors, inspect the browser console and confirm the RPC `verify_hpt_school_access_code` exists in the configured Supabase project.

Verification performed
----------------------
- JavaScript syntax check passed.
- ZIP archive integrity checked after packaging.
- Live Supabase authentication, RPCs, and video playback were not testable from this local artifact build; verify them in your environment.
