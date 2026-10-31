HPT ONLINE V99 — LEARNER MOCK EXAM + STUDENT PROFILE

What's included:
- Existing student home workflow: name + mobile -> Continue -> choose HPT or Learner's Mock Test.
- Learner choice opens MVD LEADS-style instructions, then a 30-question / 15-minute exam with an 18/30 pass mark.
- English and Malayalam use the bundled Transport Department, Kerala LLTEST question-bank source. Images are local assets and use contain/aspect-preserving layout.
- Result screen includes score, pass status, correct/incorrect/unanswered, and a closable answer-review modal with all selected and correct answers.
- Student Profile lookup by mobile is school-scoped; includes HPT and learner attempt counts, best scores and A4 report with student/instructor signatures.
- Provider admin results table includes HPT Score and Learner Score columns, with fallback if the database migration hasn't yet added the column.
- Official HPT exam flow, video-source configuration, school branding, admin tools and school-scoped HPT tables are retained. The supplied V97 archive had no local MP4/WebM files; this update does not add, remove or overwrite any remotely hosted HPT video assets.

REQUIRED DATABASE STEP BEFORE ONLINE LEARNER SAVING/PROFILE:
Run `16-learner-test-and-student-profile.sql` in Supabase SQL Editor for the same project. This additive migration creates `hpt_learner_attempts`, adds `learner_score` to `hpt_attempts`, installs school-validated learner result/profile RPC functions, and updates the school-validated HPT history RPC to return learner_score. Without it, the learner exam will still show a local result but cannot save it online, and combined profile lookup will display a migration message.

Deployment:
1. Back up the current website/repository.
2. Extract the complete ZIP and copy the contents of `hazard-perception-test/` into the existing website root while preserving folders.
3. Run the SQL migration above.
4. Deploy the website over HTTPS.
5. Test both test choices, learner mock save, answer review, Student Profile search and the existing official HPT end-to-end.
