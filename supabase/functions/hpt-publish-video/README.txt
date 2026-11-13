DEPLOY THIS FUNCTION AS: hpt-publish-video
Target Supabase project: nceufqdvuuztdfyesbxx
Endpoint: https://nceufqdvuuztdfyesbxx.supabase.co/functions/v1/hpt-publish-video

This is the Cloudflare R2 edition. It no longer uploads video binaries to GitHub.

Supported actions:
- presign_upload: verifies the Supabase access token and active Provider Admin, validates the clip, and returns a short-lived R2 presigned PUT URL.
- delete_clip: verifies the active Provider Admin and deletes the specified clip video and thumbnail from R2.

Required Supabase Edge Function secrets:
HPT_R2_ACCOUNT_ID
HPT_R2_BUCKET
HPT_R2_ACCESS_KEY_ID
HPT_R2_SECRET_ACCESS_KEY
HPT_R2_PUBLIC_BASE_URL

R2 bucket: hpt-videos
Public playback domain: https://videos.hazardperceptiontest.co.in

The website browser uploads directly to R2 using the short-lived signed URL. R2 credentials and the Supabase service role key must never be placed in public browser code.

The R2 bucket CORS policy must allow the HPT website origins to PUT, GET and HEAD objects. See R2-BUCKET-CORS-POLICY.json and R2-VIDEO-UPLOAD-SETUP.txt.
