HPT V132 — VIDEO PRELOADING + EXAM COUNTDOWN REMOVAL
===================================================

WHAT CHANGED
------------
1. Added a rolling Cloudflare R2 video-preload queue for the shuffled 10-clip exam set.
2. Clip 1 continues to preload in the main exam player during the 9-second instruction screen.
3. The next clips begin preloading in the background during the instruction screen.
4. The queue uses at most two concurrent background video requests and keeps up to three upcoming clips warm, reducing the chance of overwhelming slower mobile connections.
5. As each clip becomes active, its background preloader is released and the queue advances to later clips. Preloading therefore continues throughout the exam rather than trying to download all ten large videos at once.
6. Failed or slow background preloads do not block the exam queue; the main player retains its existing R2 loading/retry behaviour.
7. Removed the visible countdown timer from the top HUD during the live examination. Clip number and response count remain visible.
8. The internal per-clip time limit and automatic clip-advance logic are unchanged. Only the on-screen countdown display is hidden.

IMPORTANT PERFORMANCE NOTE
--------------------------
The browser cannot guarantee that all ten full video files will be downloaded within a 9–10 second loading screen. Video size, R2 response time, device memory, browser policies and the student's network speed all affect this. V132 starts the upcoming-video queue early and maintains a small rolling buffer to reduce buffering without flooding the connection or using excessive memory. It cannot guarantee zero buffering on every connection.

FILES CHANGED
-------------
- app.js
- style.css

NO DATABASE / STORAGE CHANGES
-----------------------------
- No Supabase SQL changes.
- No Edge Function changes.
- No R2 bucket, object, or URL changes.
- Existing scoring, hazard timestamps, reports, certificates, school branding, skip setting, and admin features are preserved.

INSTALLATION — PATCH
--------------------
1. Back up the current repository.
2. Extract HPT-V132-Video-Preload-Patch.zip into the cloned project root, preserving paths and replacing app.js and style.css.
3. Commit and push to the GitHub Pages deployment branch.
4. After deployment, hard-refresh desktop browsers (Ctrl+F5) and refresh/clear cached site files on mobile if needed.
5. Test the examination on both desktop and mobile, including a slower network if possible.

TEST CHECKLIST
--------------
- The instruction/loading screen remains visible for its existing minimum reading time.
- Clip 1 is prepared before the exam begins when the connection allows it.
- Upcoming R2 clips start preloading in the background, with a maximum of two concurrent preload requests and up to three warm upcoming clips.
- Clip 2 onward plays through the rolling queue; if a preload is unavailable, the normal player load/retry path remains available.
- No countdown number is visible in the top examination HUD.
- The existing internal clip time limit still advances a clip automatically.
- Clip number, response counter, scoring, and result/report functions remain operational.
