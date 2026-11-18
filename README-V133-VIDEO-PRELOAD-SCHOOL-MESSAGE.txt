HPT V133 — Video Preload + Custom School Disabled Message
========================================================

WHAT IS INCLUDED
----------------
1. Carries forward the V132 video performance work: Clip 1 is preloaded during the 9-second instructions screen, and the next clips are loaded in a rolling queue (up to 3 upcoming clips, at most 2 simultaneous preload requests). The visible top countdown stays hidden; the internal clip time limit remains active.
2. Adds a custom message per disabled driving school. In Provider Admin -> Driving Schools, clicking DISABLE asks for the message students should see. The prompt is prefilled with that school's saved message. Admin can also edit the message in the school form.
3. When a student enters a disabled school's access code, a branded popup shows the school name and stored custom message. The same message appears if a saved school session is revalidated and found disabled.

SUPABASE SQL REQUIRED
---------------------
Run 27-hpt-school-custom-disabled-message.sql once in the same Supabase project before publishing the website. It adds public.hpt_schools.disabled_message and updates verify_hpt_school_access_code(text) to return the custom message only when the school is disabled. Existing schools receive a generic default message.

DEPLOYMENT
----------
1. Back up your GitHub repository and Supabase database.
2. Run 27-hpt-school-custom-disabled-message.sql in Supabase SQL Editor.
3. Extract the patch into the existing repository root, or replace the project with the complete ZIP.
4. Commit and push to GitHub Pages.
5. Hard refresh the site. In Provider Admin, open Driving Schools, click DISABLE beside a test school, and enter a custom message.
6. Test the disabled school's access code in a private/incognito window. Confirm the popup displays the exact custom message. Re-enable the school afterwards.

UNCHANGED
--------
- hpt-publish-video Edge Function and Cloudflare R2 settings.
- Supabase school/student/exam data (except the new disabled_message field).
- HPT exam scoring, reports, certificates and attempt persistence.
- Existing rolling video preload logic and hidden live-exam countdown.

NOTES
-----
The application does not download all ten full MP4s simultaneously. It prioritises the first video and maintains a rolling upcoming-video buffer to reduce stalls without forcing high data usage or memory pressure on mobile devices. Browser/network conditions can still affect playback; this optimises but cannot guarantee zero buffering on every connection.
