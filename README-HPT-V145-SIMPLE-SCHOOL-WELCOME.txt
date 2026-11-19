HPT V145 — SIMPLE SCHOOL WELCOME SPLASH

INSTALLATION (PATCH)
1. Extract HPT-V145-Simple-School-Welcome-Patch.zip.
2. Open the inner hazard-perception-test folder.
3. Copy its contents into the root of your existing repository folder and allow overwrite.
4. Commit and push to main.
5. After deployment, close old tabs and reopen the site. On desktop use Ctrl+F5 once.

WHAT CHANGED
- Replaced the busy loader dashboard with only the school logo, red/gold WELCOME TO banner, dynamic school name and gold underline swoosh.
- Uses the same V143 desktop and mobile road backgrounds used by the website.
- Loads the selected school logo and name dynamically from the verified school record; no school is hard-coded.
- Waits for the school homepage, logo, responsive background and bundled Malayalam font to preload before fading away.
- Retains the V144 global Noto Sans Malayalam font support for current and future Malayalam school names.
- Retains the V143 baseline features and V144 homepage-preparation hand-off.

NO SUPABASE SQL, EDGE FUNCTION OR R2 CHANGES ARE REQUIRED.

TEST
1. Log in with a school whose logo is circular and another whose logo is rectangular, if available.
2. Test a school name in Malayalam on Windows and Android.
3. Confirm the welcome screen shows only the logo, WELCOME TO ribbon, school name and yellow underline.
4. Confirm the matching V143 desktop/mobile background is used.
5. Confirm the school homepage is ready underneath and appears smoothly when the splash fades.

Validation: JavaScript syntax, HTML structure/IDs, CSS brace balance, font/background references, and ZIP integrity. Actual live device appearance still requires testing after deployment.
