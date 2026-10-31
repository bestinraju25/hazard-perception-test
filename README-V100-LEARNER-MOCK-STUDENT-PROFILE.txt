HPT V100 — DEPLOYMENT CHECKLIST

1. Back up the current GitHub repository and Supabase database.
2. Run `16-learner-test-and-student-profile.sql` in Supabase SQL Editor only after the base HPT multi-school tables and school access verification are installed. It is additive; it preserves existing HPT attempts.
3. Copy the contents of the `hazard-perception-test/` folder into the website root, retaining relative paths for `videos/`, `learner-question-assets/`, `audio/`, and other assets. Deploy over HTTPS.
4. Test: school access code -> candidate name/mobile -> Continue -> choose either HPT or Learner's Mock Test. Confirm official HPT starts the old official flow.
5. For the learner path, check Instructions -> Start Exam -> 30 randomized questions -> 15-minute timer -> result -> View Test Results modal (all selected/correct options) -> close -> Retake/Return. Practice has no timer.
6. In Student Profile, search a mobile number from the active school, verify HPT/learner attempt counts and max scores, then print the A4 report and check student/instructor signature lines.
7. Verify provider results show the HPT Score and Learner Score columns.

DATA MODEL: learner mock attempts and all answers are stored in `hpt_learner_attempts`; the best learner score is also copied into `hpt_attempts.learner_score` for combined legacy views. No question-bank IDs, correct-option indexes, or local question images are changed in the text cleanup.

NOTE: browser rendering and actual Supabase writes must be tested on the live deployment. The package cannot apply a SQL migration to your Supabase project automatically.

VIDEO ASSETS NOTE: The submitted V97 source ZIP contained no local MP4/WebM video files. Video configuration/database integration is left intact, but the ZIP cannot carry files that were not present in the input. If the current website uses GitHub-hosted video URLs or Supabase metadata, preserve those remote assets and verify playback after deployment.
