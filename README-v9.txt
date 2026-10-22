RAJU MOTOR DRIVING SCHOOL — HPT v9

What changed:
- Admin dashboard uses Supabase Auth + existing admin_users active-admin gate.
- Results load from hpt_attempts; admins can view and delete complete attempts.
- Deleting an attempt cascades to hpt_responses.
- Video editor loads the saved static/GitHub URL for an existing clip.
- Selecting a replacement local video previews it immediately.
- MARK HAZARD 1 / 2 captures preview.currentTime and updates the visible timeline marker.
- PUBLISH VIDEO TO GITHUB uploads the selected video through a Supabase Edge Function. The browser never receives the GitHub token.
- Supabase stores metadata/annotations/results, not video binaries.

DEPLOYING THE SECURE VIDEO PUBLISHER
1. Deploy supabase/functions/hpt-publish-video/index.ts as a Supabase Edge Function named hpt-publish-video.
2. Set secrets:
   HPT_GITHUB_TOKEN = a GitHub token with contents:write for bestinraju25/rajudrivingschool.
   HPT_GITHUB_REPO = bestinraju25/rajudrivingschool
   HPT_GITHUB_BRANCH = main
3. Set githubPublishEndpoint in hpt-config.js to:
   https://laobedcdrwgaxlbnswze.supabase.co/functions/v1/hpt-publish-video
4. Run supabase-hpt-v9-migration.sql.
5. Publish this hazard-perception-test folder to GitHub Pages.

IMPORTANT
The Edge Function deliberately accepts only paths under hazard-perception-test/videos/.
The GitHub token is never put in client-side JavaScript.
Existing Defensive Driving Seminar tables/RPCs are not changed by this migration.
