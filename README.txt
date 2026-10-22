RAJU HPT — ADMIN V6

WHAT CHANGED
- Candidate dashboard has no visible Admin button. Admin is a direct URL: admin.html.
- Admin login uses the SAME Supabase Auth + admin_users(active=true) identity used by the Defensive Driving Seminar.
- New responsive dashboard with examination statistics, candidate results, search/filter, CSV export and attempt detail.
- Video library with add/edit/enable/disable/delete.
- Video annotation editor: play the actual video, click the custom timeline to seek, and press MARK HAZARD 1/2. Markers reflect the exact timestamp immediately.
- Hazard timestamps and descriptions are stored in Supabase.
- Video binaries remain on GitHub/static hosting; the admin generates annotation JSON for Git publishing.
- No seminar files are included or modified by this package.

SUPABASE
Run supabase-hpt-v6.sql after your existing Raju schema. It reuses public.is_admin() and public.admin_users from the existing admin system and tightens HPT admin policies.

ADMIN URL
admin.html

VIDEO PUBLISHING
The browser intentionally does not contain a GitHub Personal Access Token. Put the video at the exact static path saved in the HPT video metadata.
