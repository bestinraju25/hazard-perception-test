HPT V130 — EXAM START LOADER, DAILY ACTIVITY DELETE, VIDEO EDITOR MODAL
=======================================================================

CHANGES
-------
1. Replaced the isolated exam hint with a compact bulb-style box. The message stays small and does not intercept any screen taps.
2. Added a game-style examination loading screen. It appears while the HPT clip catalogue is loaded, then preloads the first shuffled examination clip. It remains for at least four seconds and waits for the first clip to become playable (up to a bounded 14-second first-clip wait).
3. Added a delete icon in each row of Provider Admin -> Today's HPT Student Activity. Removing an entry hides it from this daily monitoring view. Official attempts, responses, results, scores, student identities and certificates remain unchanged.
4. Changed Video Library -> Upload New Video / Edit to a centred modal. Successful saves close the modal automatically. On a save error, the modal stays open so the administrator can fix the issue.

SUPABASE SQL REQUIRED FOR ACTIVITY DELETE
-----------------------------------------
Run `26-hpt-activity-hide.sql` once in Supabase Dashboard -> SQL Editor.
It creates an admin-only tombstone table and the `hpt_hide_exam_activity` RPC. The RPC checks `public.is_admin()` and stores only the hidden session/attempt references. It does not delete official examination data.

DEPLOY
------
1. Back up your working GitHub repository and Supabase database.
2. Run `26-hpt-activity-hide.sql` once in Supabase SQL Editor.
3. Extract the V130 update patch into your cloned repository root, keeping the shown folder structure, or use the full V130 ZIP as your project source.
4. Commit and push the changed files to GitHub `main`.
5. Wait for GitHub Pages deployment, then hard refresh (`Ctrl+F5`).

TEST CHECKLIST
--------------
- Start an HPT exam and confirm the branded loading screen appears immediately after access verification, with animated road/progress feedback.
- Confirm the screen is visible for at least four seconds and the first shuffled clip is preloaded before playback begins where the network allows.
- Confirm the exam hint shows the bulb box and small message, and tapping the hint area still registers a response because the hint does not intercept pointer input.
- In Provider Admin -> Today's HPT Student Activity, delete a test row, refresh, and confirm it remains hidden.
- In Provider Admin -> Video Library, click Upload New Video. Confirm the editor opens as a modal, upload/mark hazards, save, and confirm the modal closes automatically only after the save succeeds.

NOTES
-----
- Only the first shuffled clip is preloaded; the other nine are loaded normally as the exam advances. Preloading all clips could consume a large amount of mobile data and delay students.
- The activity delete is intentionally a soft hide. It removes the row from this Admin daily activity monitor but preserves the underlying official examination data. This is safer for test entries and avoids destroying records that may be included in historical reports.
- If the SQL migration has not been run, the Today Activity delete action will return an error instructing you to run this migration; the rest of the dashboard continues to work.
- Supabase login, school access, the Skip Clip global toggle, existing scoring, exam reports, certificates, R2 upload/playback, school logos, registration, and student records are not modified by this V130 update.
