V110 — PROVIDER ADMIN EXAMINATION CARDS

WHAT CHANGED
- Selecting a driving school now opens two separate examination cards: Hazard Perception Test and Learners Mock Test.
- HPT opens the existing HPT attempt table and existing report/certificate actions.
- Learners opens only records from hpt_learner_student_summary, so HPT-only students never appear in the Learners list.
- Learners rows show candidate name, normalized phone, lifetime attempt count, best score out of 30, pass status and summary last-updated time.
- Search works locally in the browser. Switching between schools and cards does not issue additional Supabase requests.

SUPABASE ACTION REQUIRED (ONE TIME)
- Run 18-admin-learner-summary-read.sql in the Supabase SQL Editor.
- This creates an authenticated-admin-only RPC. It checks admin_users.id = auth.uid() and active = true.
- The summary table remains inaccessible directly to anon/authenticated users. No stored data or existing tables are modified.

DATA LIMITATION
V105 stores aggregate Learners data only. The admin cannot show individual Learners attempt dates, per-attempt scores or answer history because those details are not retained. The displayed timestamp is when the lifetime summary row was last updated.

REQUEST BEHAVIOUR
- The Learners summary is fetched once during the admin dashboard's initial load/explicit refresh and cached in memory. Opening cards, changing schools, searching and switching views are client-side only.
- Existing HPT polling and data requests remain unchanged.
