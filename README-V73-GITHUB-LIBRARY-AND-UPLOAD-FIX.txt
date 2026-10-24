V73 — GITHUB VIDEO UPLOAD + COMPLETE VIDEO LIBRARY FIX

WHAT WAS WRONG
1. The admin Video Library queried only public.hpt_videos. GitHub's videos/ folder is a separate source, so files without a matching Supabase row were hidden. The current repository has clips 1–29.
2. The publishing function source existed locally, but it must be deployed to the Supabase project for uploads to work.

WHAT CHANGED
- The Edge Function now supports action=list_videos and returns all numbered video files in GitHub videos/.
- The admin library merges GitHub files with Supabase hpt_videos/hpt_hazards metadata. Existing GitHub videos with no Supabase row appear as SETUP REQUIRED rather than disappearing.
- Use CONFIGURE HAZARDS on those clips, set hazard 1 (and optional hazard 2), then Save & Publish. This creates the missing hpt_videos/hpt_hazards records without re-uploading the file.
- New/replacement videos still upload to GitHub repository bestinraju25/hazard-perception-test, branch main, inside videos/.
- The publishing client uses supabase.functions.invoke for the project's configured auth/session headers and better surfaced error responses.
- The function validates the user token with Supabase Auth and verifies public.admin_users.active before listing, uploading, or deleting. Gateway verify_jwt is disabled to avoid legacy JWT gate incompatibilities; the in-function admin check remains required.

DEPLOY ONCE
1. In Supabase Dashboard > Edge Functions > Secrets, set HPT_GITHUB_TOKEN to a fine-grained GitHub token with Contents: Read and write permission on bestinraju25/hazard-perception-test.
2. Extract this ZIP. Open the hazard-perception-test folder.
3. Run DEPLOY-HPT-PUBLISH-VIDEO-WINDOWS.bat and complete Supabase login when prompted.
4. Refresh admin.html and open Video Library. The status line should report the number of videos discovered in GitHub.

UPLOAD LIMIT
This function currently accepts videos up to 15 MB and thumbnails up to 5 MB. Existing repository clips are approximately 4.8–7.8 MB, so they fit. GitHub's Contents API does not support files above 100 MB; keep HPT clips compressed well below that limit.

IMPORTANT
- The function deployment is a required one-time cloud step; editing this ZIP alone does not deploy code to Supabase.
- Do not put HPT_GITHUB_TOKEN in browser JavaScript or share it in chat.
- Video files are saved to GitHub, not to hpt-manager-videos. The offline manager bucket is not modified.
- The test engine still uses only active clips that have at least one hazard configured; the configured exam clip count remains 10.
