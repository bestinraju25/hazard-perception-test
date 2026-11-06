HAZARD PERCEPTION TEST — V119 ADMIN & MOBILE IDENTITY UPDATE
==============================================================

ADMIN SCHOOL OVERVIEW
---------------------
- School cards now visually prioritise the registered-student count.
- HPT attempt, passed and failed totals appear underneath.
- Selecting a school opens the existing HPT / Learner's Mock Test chooser.
- Learner's Mock Test card is shown only for Kerala schools; non-Kerala schools remain HPT-only.

ADMIN RECORD ACTIONS
--------------------
- Admin can delete a Learners Mock Test summary record from the Learners students list.
  This deletes that school's learner attempt count and best score, and clears the mirrored
  learner_score value from the related HPT records. HPT examination records themselves remain.
- Admin can permanently delete a school from Driving Schools. The confirmation explains
  that school-owned HPT attempts/responses, Learner summaries and student identities will
  be deleted. Shared HPT videos and other schools are not deleted.

MOBILE NUMBER RULES
-------------------
- Each school's registered mobile number must be unique across the school registry.
  If it is already registered, a new registration is rejected and the form offers
  Forgot Access Code? to recover the existing code using that number.
- A student profile is unique by school + last 10 digits of mobile number. The same
  number identifies the same student in HPT and Learner Mock Test at that school.
- When the student completes a later test using the same number but a different name,
  the newest name becomes the canonical name shown in historical HPT reports, Learner
  summaries and the student profile.
- HPT requires a valid 10–15 digit phone entry before the exam starts.

SUPABASE — REQUIRED ONE-TIME MIGRATION
-------------------------------------
Run 21-admin-delete-and-student-mobile-uniqueness.sql only after migrations 17, 18, 19
and 20. Back up the database first. The migration installs a server-side contact-number guard (including concurrent registration protection). It blocks new duplicates across all schools. It also prints a diagnostic list if duplicate school numbers existed before this update; resolve those legacy duplicates in Admin → Driving Schools. Existing learner summary records are normalised to the last 10 mobile digits and consolidated while preserving total attempt counts and the best score.

DEPLOYMENT
----------
Use the updated index.html, app.js, school-registration.js, admin.html, admin.js,
admin.css and school-manager.js together. The school overview now places the registered-student count prominently on its own row, with attempts, passed and failed directly underneath. Cache-busting versions have been updated.
Keep hpt-config.js and the existing Supabase project settings unchanged. Preserve the
existing videos/ directory separately; it is intentionally excluded from the ZIP.

PAY ATTENTION
-------------
Delete School is permanent. Verify the selected school before confirming deletion.
The new database functions permit permanent removal of that school's result data.
