HPT V129 — OFFICIAL HPT BRANDING, NO-LOGO CHECKBOX AND CLEAN EXAM INSTRUCTION
=============================================================================

WHAT CHANGED
------------
1. Platform default logo
   - The current official Hazard Perception Test transparent PNG is bundled at:
     assets/hpt-brand-logo-v129.png
   - All platform/default logo references now use this new versioned asset.
   - The HPT logo is used in the landing/intro, HPT default school branding, exam/result headers,
     certificate/report layouts, learner mock test, practice simulator, provider Admin, school
     statistics, school-management cards and registration preview.
   - Browser/PWA icons are updated to hpt-favicon-v129-192.png and hpt-favicon-v129-512.png.

2. School logos remain school-specific
   - If a school's hpt_schools.logo_url is present, that school's own logo continues to be used.
   - Existing school logo_url values are not rewritten or deleted.
   - Only rows with a NULL/empty logo_url fall back to the HPT platform logo.

3. Public school registration — explicit No Logo choice
   - A checkbox labelled "No Logo — use the HPT logo" is shown during registration.
   - It is checked by default.
   - While checked, the logo file chooser is disabled and the HPT logo preview is shown.
   - Untick it to enable browsing for a school's own PNG/JPG/WebP logo.
   - If it is unticked but no file is selected, the HPT logo fallback is still used.
   - If a file is selected, only that school's own uploaded logo is stored in logo_url.

4. Exam video instruction
   - The large centered TAP WHEN YOU SEE A DEVELOPING HAZARD overlay is removed.
   - The old lower-left "Look ahead, to the sides and behind" message is replaced with a smaller,
     plain text hint: "Tap anywhere on the video to mark your response."
   - The hint is transparent, compact, and pointer-events:none so it does not block taps.
   - The video scene remains clear; existing tap-anywhere response capture is unchanged.

SUPABASE MIGRATION REQUIRED
---------------------------
The live registration RPC currently validates school logo URLs and may reject NULL logo_url.
Run this SQL migration once in Supabase Dashboard -> SQL Editor:

  25-hpt-optional-school-logo-v128.sql

It updates only public.register_hpt_school(...). It allows p_logo_url to be NULL and preserves
validation for non-null URLs. It does not update, remove, or replace existing school logos.
The hpt_schools.logo_url column must remain nullable (the script includes a verification query).

DEPLOYMENT ORDER
----------------
1. Back up the current GitHub repository and Supabase database first.
2. Run 25-hpt-optional-school-logo-v128.sql once in the correct Supabase production project.
3. Copy the project files from this ZIP into the cloned GitHub repository root, preserving folders.
   If using the patch ZIP, merge/overwrite only the included relative paths.
4. Commit and push to the GitHub main branch.
5. Wait for GitHub Pages deployment, then hard-refresh the site (Ctrl+F5 on desktop).
6. Test a new school registration with No Logo checked:
   - logo browse input should be disabled;
   - the HPT logo should preview;
   - registration should complete;
   - the new school's logo_url should be NULL;
   - after the school is enabled and logs in, HPT branding should appear.
7. Test another registration with No Logo unchecked and a custom image selected:
   - file browse should be enabled;
   - the image should upload to hpt-school-logos/public-registration/;
   - the new school's own logo should appear after login.
8. Test a school that already has a custom logo to confirm it remains unchanged.
9. Start a test exam and verify the small lower-left hint appears, the central overlay is gone, and tapping anywhere over the video still records a response.

IMPORTANT
---------
- This patch does not change exam scoring, attempt records, R2 storage, Edge Functions, school access
  codes, payment settings, or existing school logos.
- Do not set a school's logo_url to the HPT logo URL in the database; keep it NULL when the school
  has no custom logo. The client-side fallback will display the official HPT logo.
- Keep the exact uploaded transparent HPT logo asset intact; no recoloring or redrawing is applied.
