HPT V131 — REFERENCE-MATCHED EXAM INSTRUCTIONS LOADING SCREEN
===========================================================

WHAT CHANGED
------------
- Rebuilt the examination interstitial to closely follow the supplied desktop and mobile references.
- Uses the existing official HPT platform logo and the project's desktop/mobile scenic road backgrounds.
- Displays five clear instruction cards: Watch the Video, Spot the Hazard, Scoring, Click Limit, and Pass Requirement.
- Includes the automatic-start line, animated progress bar, percentage, live preparation status, and road-safety tip.
- Responsive layout: two columns on desktop and a compact one-column card list on mobile.
- The interstitial remains visible for at least 9 seconds from its first appearance, giving candidates time to read the instructions.
- While visible, the app loads examination configuration, selects the shuffled clips, and preloads the first video from its configured video source (Cloudflare R2 in the current setup).
- If the first video is still not playable after the preload window, the interstitial closes with a clear transition and the normal player load/retry path continues.
- No scoring, result, database, school logo, Supabase Edge Function, or R2 upload logic has been changed.

FILES CHANGED
-------------
- index.html
- app.js
- style.css

INSTALLATION
------------
1. Back up the current GitHub repository.
2. Extract the V131 patch into the cloned project root, preserving the folder structure and replacing the three matching files.
3. Commit and push to the main branch.
4. Wait for GitHub Pages to deploy, then use Ctrl+F5 (desktop) or clear/refresh the mobile browser cache.
5. Test on desktop and mobile. Confirm that the instructions remain visible for at least 9 seconds and that the first video is ready before the examination screen appears.

NOTES
-----
- The existing assets/hpt-road-desktop.webp and assets/hpt-road-mobile.webp are reused; no external network image dependency was added.
- Existing R2 URLs and Supabase configuration are unchanged.
- If the first video is not ready by the upper preload limit, the exam still proceeds through the ordinary player loading behaviour rather than remaining stuck on the interstitial.
