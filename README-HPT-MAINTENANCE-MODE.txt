HPT GLOBAL MAINTENANCE MODE
===========================

Files changed:
- admin.html / admin.js / admin.css: provider admin control to enable/disable maintenance and customize the visitor heading/message.
- hpt-maintenance-guard.js: public-page lock screen and 30-second status refresh.
- index.html, learner-test.html, drive-yourself.html, school-stats.html: load the maintenance guard.
- 23-site-maintenance-mode.sql: creates a separate, low-sensitivity status table with public SELECT and active-admin UPDATE only.

SETUP
-----
1. Open Supabase Dashboard -> SQL Editor for project nceufqdvuuztdfyesbxx.
2. Run 23-site-maintenance-mode.sql once.
3. Publish the updated website files to the existing GitHub Pages repository.
4. Open Admin -> sign in -> Website Maintenance Mode.
5. Set the visitor heading/message and click ENABLE MAINTENANCE MODE.
6. To restore the site, revisit Admin and click DISABLE MAINTENANCE MODE.

BEHAVIOUR
---------
- New public page visits check the maintenance flag before showing the page.
- Existing public tabs re-check approximately every 30 seconds and then show the maintenance screen.
- The screen blocks normal interaction with the public page and displays the custom message.
- admin.html is intentionally NOT gated, so an authorised provider admin can always disable maintenance.
- If Supabase is temporarily unreachable or the status table has not been created, the public website fails open (normal site remains accessible) rather than showing a false maintenance screen.

IMPORTANT LIMITATION
--------------------
This is a website-level maintenance lock. It blocks normal interaction through the HPT public pages. It is not a complete API/database shutdown: a technically advanced client could still call any separately exposed API for which it has permission. Existing Supabase RLS and admin protections remain unchanged. It does not modify or delete any student, school, attempt, response, score, video or hazard data.

ACTIVE EXAMS
------------
Enabling maintenance can interrupt exams already in progress. The Admin UI displays a confirmation warning before enabling it. The maintenance lock reaches already-open tabs on their next status poll (within about 30 seconds).
