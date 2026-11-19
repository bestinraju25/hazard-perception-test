HPT V146 — SCHOOL WELCOME DISPLAY DURATION

CHANGE
- The existing simple school welcome splash (school logo, red WELCOME TO ribbon, school name and gold underline) now stays visible for at least 6.5 seconds before beginning its fade-out.
- Homepage preparation, school logo loading, responsive background preloading and Malayalam font loading continue in parallel. The splash closes only after those readiness checks have completed or reached their existing safe timeout.
- The fade transition remains unchanged.

INSTALLATION (PATCH)
1. Extract HPT-V146-School-Welcome-Duration-Patch.zip.
2. Open the included hazard-perception-test folder.
3. Copy its contents into your existing GitHub repository folder and allow the two updated files to replace the old ones.
4. Commit and push to main.
5. Reopen https://www.hazardperceptiontest.co.in/ after deployment. Use Ctrl+F5 on desktop if the old script is cached.

FILES UPDATED
- index.html (hpt-experience.js cache version changed to v146)
- hpt-experience.js (minimum splash display set to 6,500 ms)

NO SUPABASE SQL, EDGE FUNCTION OR R2 CHANGES ARE REQUIRED.

VALIDATION
JavaScript syntax, HTML structure and archive integrity were checked. The deployed timing should be confirmed on desktop and mobile.
