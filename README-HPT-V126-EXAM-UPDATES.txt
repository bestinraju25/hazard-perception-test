HPT v126 — scoring, report evidence, skip control and daily activity
====================================================================

Included improvements
---------------------
1. Reaction scoring updated consistently for all new HPT attempts:
   - 0.00–0.50 seconds: full marks.
   - Above 0.50 through 1.00 seconds: deduct progressively, reaching 1 mark at 1.00 second (2 marks per second over this half-second interval).
   - Above 1.00 seconds: deduct 3 additional marks per second.
   - Final hazard marks are rounded to the nearest whole mark and never below zero.
   - The same mark deductions apply to a 10-mark single-hazard clip and 5-mark two-hazard clip.
   - A matched click remains “identified” in the result/report even if its delay reduces the awarded marks to zero; only unmatched/no click is counted as missed.
   - Responses are still accepted only within the existing 5-second hazard window and the existing maximum of 5 clicks per clip.

2. Full report improvements:
   - Waits for the browser to decode/present the requested frame after seeking.
   - Retries frame capture at the timestamp and nearby frames, detects an all-black/empty capture, and shows a clear fallback instead of a black image.
   - Uses CORS-enabled video loading for R2, validates the entire frame rather than one corner, checks the presented frame timestamp, and retries nearby frames.
   - Provider Admin REPORT actions open the same full report view, including image lightbox and per-hazard/overall feedback.
   - Adds constructive, performance-based feedback per hazard and an overall report message.
   - Admin report action uses the same report view (generate is an alias for open).

3. Exam UI:
   - The playback timeline is slightly thicker on desktop and mobile for better visibility.
   - Skip Clip:
   - Provider-wide setting in Admin > Examination Controls.
   - Default is OFF; when OFF, Skip Clip is hidden on all candidate exam devices.
   - When ON, the button appears and uses the existing skip behavior.

4. Today’s HPT Student Activity:
   - Tracks a session when HPT begins, updates a 30-second heartbeat, and marks it complete after a result has been recorded.
   - Provider Admin sees unique students, completed sessions, active sessions and incomplete/interrupted sessions for the current India Standard Time day, including start and completion times.
   - On first rollout, completed attempts from the existing hpt_attempts table are merged into today's list so earlier tests from the same day are not omitted.
   - Filters by school/status and exports the currently filtered rows to CSV.
   - HPT-only; Learner Mock Test summary records do not retain individual attempt dates and are not included in this daily HPT list.

Deployment
----------
A. BACK UP the current repository and Supabase SQL/data before deployment.
B. Run 24-hpt-daily-exam-activity.sql once in Supabase SQL Editor. This adds hpt_settings.allow_skip, a public-safe settings RPC, and an RLS-protected provider-only hpt_exam_sessions table with school-code-validated RPCs. It does not alter hpt_attempts, hpt_responses or any historical scores.
C. Copy all files from this ZIP over the same paths in the existing GitHub repository, preserving the remaining assets and configuration.
D. Commit/push to main and wait for GitHub Pages deployment.
E. Open the provider Admin page, choose the desired Skip Clip setting (default OFF), and test it.
F. Start a test HPT exam and verify Today's HPT Student Activity changes to Active Now. Complete the exam and verify the row changes to Completed with the saved score.
G. Test Full Examination Report from the candidate result screen and Admin report action. Confirm actual hazard and candidate click frames are visible for the test clip(s).

Scoring note
------------
The revised formula applies to new exams only. Existing historical totals and response marks in Supabase are not recalculated. New scores are saved through the same hpt_record_attempt RPC and continue to drive pass/fail and leaderboard summaries.

Daily activity note
-------------------
An examination started but not completed remains visible as Incomplete / Interrupted after its heartbeat is more than 2 minutes old. The dashboard does not falsely treat an abandoned/closed tab as a completed exam. If the canonical exam result cannot be saved, the session remains incomplete rather than showing a false completed status. Session tracking is best-effort: if the migration has not been run, the exam can still proceed, but no daily session row will be available for that attempt.

Files changed
-------------
- app.js, hpt-report.js, index.html, admin.js, admin.html, style.css, admin.css (including Admin report modal support)
- new hpt-scoring.js
- new 24-hpt-daily-exam-activity.sql
