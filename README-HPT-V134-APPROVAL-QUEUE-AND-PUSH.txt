HPT V134 — WAITING FOR APPROVAL + MOBILE REGISTRATION NOTIFICATIONS
====================================================================
Built on V133 (rolling R2 preload, hidden visible exam countdown, per-school disabled message).

WHAT CHANGED
------------
1. Driving Schools now opens on a dedicated WAITING FOR APPROVAL tab.
   - New self-registered schools appear here automatically.
   - The tab shows the pending count and refreshes automatically every 30 seconds while the Driving Schools panel is open.
   - ALL SCHOOLS contains the existing full registry.
   - APPROVE & ENABLE keeps the existing payment-verification confirmation. Check GPay/bank receipt before confirming.
2. Added ENABLE MOBILE NOTIFICATIONS in the provider admin.
   - Uses browser Web Push and a service worker, not just a popup while the page is open.
   - New self-registrations trigger a notification containing the school name.
   - Clicking the notification opens Admin > Driving Schools.
   - The admin must enable notifications separately on each phone/browser.
3. Updated the default disabled-school message to:
   “This driving school’s access is temporarily disabled. For any queries, please contact Bestin Raju on 8943764734.”
   - Existing custom messages are preserved. Only the previous default/blank message is replaced.

INSTALL ORDER
-------------
A) DATABASE — Supabase SQL Editor
   1. Open the HPT Supabase project.
   2. Run 28-hpt-admin-registration-push-notifications.sql once.
   3. Confirm the final verification query shows the push table and notification column.
   This migration does not delete schools, students, attempts, results or videos.

B) VAPID KEYS — REQUIRED ONE-TIME SETUP
   The separate HPT-V134-SUPABASE-PRIVATE-KEY.txt file contains the generated VAPID
   PRIVATE key. Keep it private; do not commit it or upload it to GitHub.
   The matching PUBLIC key is already included in hpt-admin-push-config.js.

   In Supabase Dashboard:
   1. Open Project Settings → Edge Functions → Secrets (wording may vary).
   2. Add HPT_VAPID_PUBLIC_KEY using the public key shown in hpt-admin-push-config.js.
   3. Add HPT_VAPID_PRIVATE_KEY using the value in HPT-V134-SUPABASE-PRIVATE-KEY.txt.
   4. Add HPT_VAPID_SUBJECT with value https://www.hazardperceptiontest.co.in/.
   5. Never put the private key in hpt-config.js, JavaScript, a SQL file, or GitHub.

C) EDGE FUNCTION — REQUIRED ONE-TIME DEPLOYMENT
   1. In Supabase Dashboard → Edge Functions, create a function named exactly:
      hpt-registration-notify
   2. Paste/deploy the source from:
      supabase/functions/hpt-registration-notify/index.ts
   3. Turn OFF the dashboard “Verify JWT” gateway option for this function.
      This is needed because public school registration calls it using the publishable key.
      The function itself only accepts a fresh, real, pending school registration ID,
      checks it against Supabase, and claims each registration once before notifying.
   4. The function uses the project's built-in SUPABASE_URL and
      SUPABASE_SERVICE_ROLE_KEY environment values, plus the three HPT_VAPID_* secrets above.

D) WEBSITE — DEPLOY THE PATCH
   Copy the patch files into the repository root, preserving the supabase/functions path.
   Commit and push to GitHub main. Wait for GitHub Pages to publish, then hard-refresh Admin.

E) ENABLE ON YOUR PHONE
   1. Open https://www.hazardperceptiontest.co.in/admin.html on your phone.
   2. Sign in using the active provider-admin account.
   3. Open Driving Schools and tap ENABLE MOBILE NOTIFICATIONS.
   4. Allow notifications when the browser asks.
   5. Leave notifications enabled. A new test registration should trigger an alert.

PHONE NOTES
-----------
- Android: use Chrome and allow notifications for the website.
- iPhone/iPad: add the website to the Home Screen first, open the installed web app,
  sign in, then enable notifications. Web Push on iOS requires iOS/iPadOS 16.4 or later.
- Notification permission must be granted by the person using the phone. The setup is
  per device; repeat it for any additional phone/browser you want notified on.
- If the notification button says the VAPID key or push setup is missing, complete
  steps B and C before enabling it.

FILES ADDED/UPDATED
-------------------
Updated: admin.html, admin.css, school-manager.js, school-registration.js, supabase/config.toml
Added: hpt-admin-push-config.js, hpt-admin-push.js, hpt-admin-sw.js,
       28-hpt-admin-registration-push-notifications.sql,
       supabase/functions/hpt-registration-notify/index.ts

VERIFICATION
------------
JavaScript syntax, SQL structure, HTML IDs, service-worker file presence and ZIP integrity
were checked locally. The Supabase migration, Edge Function deployment and real phone push
cannot be verified from this workspace; complete the setup above and perform a live test.
