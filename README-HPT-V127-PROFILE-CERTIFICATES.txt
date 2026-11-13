HPT V127 — EXAM INSTRUCTION + STUDENT PROFILE CERTIFICATES
==========================================================

Changes
-------
1. Replaced the large yellow TAP WHEN YOU SEE A DEVELOPING HAZARD button-style overlay with a small, plain text hint:
   “Tap anywhere on the video to mark your response when you spot a developing hazard.”
   It is non-interactive and does not block taps on the video.

2. Added a Print HPT Certificate button under the HPT best-result row in the school Student Profile. It appears only when the highest recorded HPT score meets the configured HPT pass mark (default 60/100).

3. Added a Print Mock Test Certificate button under the Learner’s Mock Test best-result row. It appears only when the highest recorded Learner’s Mock Test score is at least 18/30.

4. Both certificates are generated as landscape A4 PDFs with school identity, student name, examination name, best recorded score, pass mark and issue date. They clearly state that the certificate is a school/platform achievement certificate, not a government-issued driving licence or statutory qualification.

5. Existing one-page A4 Student Performance Report button remains unchanged.
6. Existing global Skip Clip toggle in Provider Admin remains unchanged; it was already present in V126, defaults to OFF, and is controlled using hpt_settings.allow_skip.

No SQL migration is required for V127. The certificates use the existing hpt_get_student_profile_by_school result fields.

Deployment
----------
Replace index.html, app.js and style.css in the GitHub Pages repository with the versions in this patch (or use the full ZIP). The app cache-busting query strings have been advanced to v127.

The certificates use the best score already present in the student profile summary. Because this summary retains only counts and highest scores, the certificate describes the best recorded score and uses the generation date as its issue date. It does not claim to be tied to a specific attempt date.
