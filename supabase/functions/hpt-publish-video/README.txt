DEPLOY THIS FUNCTION AS: hpt-publish-video

Secrets:
HPT_GITHUB_TOKEN=<GitHub token with contents:write on bestinraju25/rajudrivingschool>
HPT_GITHUB_REPO=bestinraju25/rajudrivingschool
HPT_GITHUB_BRANCH=main

The client sends the user's Supabase access token. The function verifies that the user is an active row in public.admin_users before touching GitHub.
