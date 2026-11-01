V105 — STUDENT PROFILE SUMMARY ONLY

- Student Profile is a centered 16:9 modal on desktop with a visible close button; on phones it becomes a full-height responsive dialog.
- The profile shows student name, school, mobile, total HPT attempts, highest HPT score, total Learner Mock attempts and highest Learner score.
- Removed HPT and Learner per-attempt history from the profile and A4 report. A4 output contains only student identity, aggregate performance table and learning progress note. No student photo, signature blocks or attempt-by-attempt rows.
- New learner mock completions update only an aggregate row (total attempts + highest score) in hpt_learner_student_summary. No per-attempt question payload, answer history, language/time details, dates or attempt IDs are persisted.
- Migration consolidates existing hpt_learner_attempts rows into aggregate counts/highest score, then drops the old per-attempt learner table.
- Existing HPT attempt rows remain in hpt_attempts because current HPT reports, certificates, manager analytics and exports depend on them. They are not shown in the Student Profile; the profile reads only HPT count and max score from that table. No HPT data is deleted by this migration.

SUPABASE ACTION REQUIRED:
1. Back up the project database.
2. Apply 17-learner-summary-only-profile.sql in Supabase SQL Editor AFTER 16-learner-test-and-student-profile.sql.
3. The migration consolidates and removes old learner attempt-detail rows. It is designed to preserve their total counts and best scores.

Static validation completed: JavaScript syntax, HTML ID references, CSS parse, ZIP integrity.
