HPT V133 — ROLLING VIDEO PRELOAD + CUSTOM SCHOOL DISABLED MESSAGE
=================================================================

WHAT IS INCLUDED
----------------
1. Carries forward the V132 video performance work:
   - Clip 1 is preloaded while the 9-second exam instruction screen is shown.
   - A rolling buffer keeps up to 3 upcoming clips prepared.
   - At most 2 video preload requests run at the same time to avoid flooding mobile connections.
   - The preload queue advances as clips are used.
   - The on-screen top countdown remains hidden. The internal clip time limit remains active.
2. Adds a custom message per disabled driving school.
   - In Provider Admin -> Driving Schools, clicking DISABLE asks the admin for the message students should see.
   - The prompt is prefilled with the school's previously saved message.
   - The message can also be viewed/edited in the school's edit form.
   - Message length is limited to 500 characters.
3. Adds a branded popup on the public access page. When a student enters a disabled school's code, the popup shows the school name and that school's custom message.
4. If a previously saved school session is found disabled on page load, the same popup is shown.
5. The 3D driving practice entry also displays the stored custom message in its status area when it revalidates a disabled school.

SUPABASE SQL REQUIRED
---------------------
Run `27-hpt-school-custom-disabled-message.sql` once in Supabase SQL Editor before publishing the website.

The migration:
- Adds `public.hpt_schools.disabled_message` with a safe default for existing schools.
- Replaces `verify_hpt_school_access_code(text)` so disabled responses include `school_name` and the custom `message`.
- Keeps the active-school payload shape used by the existing site.
- Does not modify student records, exam attempts, scores, videos, R2 settings, or other Edge Functions.

ADMIN WORKFLOW
--------------
1. Open Provider Admin -> Driving Schools.
2. Click DISABLE on the school.
3. Enter the message to be displayed to students.
4. Confirm the disable action.
5. The custom message is saved for that school and appears on its school card.
6. When the school is enabled again, its saved disabled message remains available for future use.

DEPLOYMENT
----------
1. Back up your GitHub repository and Supabase database.
2. Run `27-hpt-school-custom-disabled-message.sql` once in Supabase SQL Editor.
3. Extract the patch ZIP into your existing V132 repository root, or use the complete ZIP as a full replacement after backup.
4. Commit and push to GitHub Pages.
5. Hard refresh the site after deployment.
6. Test by temporarily disabling a test school, entering its code in a private/incognito window, verifying the popup text, and re-enabling the school.

UNCHANGED
---------
- Existing Supabase data and school records, except for the added disabled_message field.
- HPT scoring, clip timer logic, reports, certificates and exam result storage.
- Cloudflare R2 bucket, custom domain and hpt-publish-video Edge Function.
- School registration/payment and custom school logos.
- Existing video catalogue and hazard timestamps.

PERFORMANCE NOTE
----------------
The browser does not force all ten complete MP4 files to download at once. It prioritises the first clip and keeps a rolling queue of upcoming clips. This reduces the chance of a gap between clips without forcing large data downloads or memory usage on slower mobile devices. Network conditions can still affect playback, so this improves resilience but cannot guarantee zero buffering on every connection.
