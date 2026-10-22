HPT Multi-School — Access Flow Null-Element Fix
==============================================

This build fixes a frontend null-element exception during school access verification. Branding nodes are now optional-safe, the access message element is recreated if absent in an older HTML copy, and button updates are guarded. On successful verification, the app switches to the school candidate home screen.

Project URL configured in hpt-config.js:
https://nceufqdvuuztdfyesbxx.supabase.co

No SQL migration is required for this specific JavaScript exception. The existing SQL function verify_hpt_school_access_code(p_code text) must already exist and return the active school record.

Install by extracting this ZIP into a fresh folder and opening the index.html from that folder. The HTML uses app.js?v=50 to avoid reusing the older app script reference. Keep the project's publishable key in browser config; never embed a Supabase secret/service-role key.
