HPT V144 — BRANDED SCHOOL LOADING SCREEN + GLOBAL MALAYALAM FONTS

BASELINE
This build starts from the supplied HPT-V143-Complete(1).zip. It preserves the V143 payment QR, UPI ID, responsive desktop/mobile backgrounds, contact-number correction, school registration, manual approval, admin tools, notification support, video/R2 settings, exams and the Kerala SEO guide.

WHAT CHANGED
1. After a valid school access code is accepted, the previous small welcome card is replaced with a full-screen school portal initialisation screen. Its visual language matches the existing HPT examination loading screen: cinematic road background, dark blue glass panel, cyan borders, yellow headings/icons, progress bar and road-safety tip.
2. The exact school's logo, name and optional location are displayed dynamically. Malayalam school names use the locally bundled Noto Sans Malayalam font. A missing/broken school logo uses the existing HPT brand fallback.
3. The loader has five preparation steps: access verification, school branding, homepage setup, school leaderboard and portal ready. Progress text and completed/active step styling update as the homepage is prepared.
4. The full school homepage is still rendered and preloaded behind the welcome overlay before it fades away, preventing the access page flash/jump.
5. Carried forward V142 global Malayalam font handling: bundled font faces are applied to Malayalam Unicode glyphs while English typography remains unchanged across the home portal, admin, learner exam, simulator, stats, SEO guide and preview pages. The student performance print view also has local Malayalam font faces.

INSTALLATION (PATCH)
1. Extract HPT-V144-School-Loader-Malayalam-Patch.zip.
2. Open the inner hazard-perception-test folder.
3. Copy its contents into the root of your existing GitHub repository, allowing overwrite.
4. Confirm the files index.html, app.js, hpt-experience.css, hpt-experience.js, the user-facing HTML pages, hpt-malayalam-fonts.css, fonts/NotoSansMalayalam-Regular.ttf and fonts/NotoSansMalayalam-Bold.ttf were copied.
5. Commit and push to main.
6. After deployment, close old tabs and open the site again. On Windows press Ctrl+F5; on mobile reopen the website or clear the site cache if an old version remains.

NO SUPABASE SQL, EDGE FUNCTION OR R2 CHANGE IS REQUIRED.

TEST
- Enter a valid school access code. Confirm the full-screen loader appears after verification, shows that school's actual logo and name, advances through the 5 steps and fades to the already-prepared school homepage.
- Test a Malayalam-named school on Windows Chrome/Edge/Brave and on Android. The Malayalam spelling should remain identical and use the bundled Noto Sans Malayalam glyphs on both.
- Test an English-named school and a school with no logo.
- Verify registration payment still shows the V143 QR flow and the desktop/mobile backgrounds remain unchanged.

VALIDATION
JavaScript syntax checks, CSS brace balance, duplicate HTML IDs, local font and asset paths, expected V143 QR/background files, and ZIP integrity were checked. Actual font rendering and loader transition should still be confirmed on the deployed devices.
