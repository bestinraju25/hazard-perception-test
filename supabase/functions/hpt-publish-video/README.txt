DEPLOY THIS FUNCTION AS: hpt-publish-video

Target Supabase project: nceufqdvuuztdfyesbxx
Function endpoint: https://nceufqdvuuztdfyesbxx.supabase.co/functions/v1/hpt-publish-video

GitHub target repository (the live Pages site): bestinraju25/hazard-perception-test
Branch: main

Required Edge Function secrets (set in Supabase Dashboard -> Edge Functions -> Secrets):
HPT_GITHUB_TOKEN = fine-grained GitHub token with Contents: Read and write on bestinraju25/hazard-perception-test
HPT_GITHUB_REPO = bestinraju25/hazard-perception-test
HPT_GITHUB_BRANCH = main

The function verifies that the user's Supabase access token belongs to an active row in public.admin_users before it calls GitHub. The browser sends the user's access token and the project publishable key. Never put the GitHub token or Supabase service-role key in browser JavaScript.

The site stores media at the repository root in videos/ and thumbnails/. Video files are limited to 15 MB per upload; thumbnail uploads are limited to 5 MB. The function intentionally accepts only safe single filenames inside those two directories.
