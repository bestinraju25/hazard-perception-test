HPT LANDING PAGE LAYOUT FIX
===========================

This update fixes the access-code landing page shown clipped in the supplied screenshot.

WHAT CHANGED
------------
- The landing page is now a real vertical scroll container.
- Removed the conflicting overflow:hidden / forced 100svh layout from the landing section.
- Reduced the oversized header/logo spacing and access-card padding.
- Moved the access-code field and LOGIN TO SCHOOL button higher in the first view.
- Kept Forgot Access Code and Get Access Code visible as secondary actions below the main login card.
- Kept the global leaderboard, SEO section and footer in the normal scroll flow below.
- Added a visible, styled scrollbar where the browser displays scrollbars.
- Added compact desktop/laptop and portrait-mobile spacing rules.

INSTALLATION
------------
This is a complete website ZIP. Extract it and replace your current cloned website folder
with the contents of this archive (or copy the included hazard-perception-test folder over
your current working folder after making a backup).

The only changed website files are:
- index.html (cache version changed to hpt-experience.css?v=2)
- hpt-experience.css (landing page scroll and spacing fix appended)

No SQL migration is required for this layout correction.
No exam logic, access verification, registration/payment, leaderboard query, reports,
Learner's Mock Test, admin, or school manager functionality has been changed.

LOCAL TESTING
-------------
Use the supplied START-LOCAL-TEST.bat if present, or start a local HTTP server in the
website folder and open http://localhost:8000/ . Avoid testing through file:/// when
checking Supabase features, since browser file-origin rules may block network requests.

The archive excludes .git/ and videos/ as requested earlier.
