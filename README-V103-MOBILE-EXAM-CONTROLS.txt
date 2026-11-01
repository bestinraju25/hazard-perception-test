V103 — Learner Mock Exam Controls and Mobile Layout

Changes:
- Removed the Previous, Clear Answer, Check, and Next/Submit duplicate-label control row.
- Replaced it with only two in-question controls: Skip and Confirm.
- Moved controls inside the white question card, directly after the answer options and any feedback.
- Removed the question-number grid from the active exam, eliminating the cramped bottom marker strip. The question count and progress bar remain visible at the top.
- Mock exam: Confirm requires a selected answer and advances to the next question. Skip records an unanswered question and advances. Once question 30 is confirmed or skipped, both Skip and Confirm are replaced with a full-width Submit Exam button.
- Practice: Confirm checks the selected answer and then becomes Next Question; Skip advances without an answer. Practice remains untimed.
- Mock examination timer, scoring, answer review, Supabase result-save RPC, school branding, fullscreen parent overlay, Student Profile, A4 report, and existing HPT website files are retained.
- No database migration is required for this control/layout update.

Validation performed:
- JavaScript syntax check passed.
- HTML IDs are unique and the new controls exist.
- Old navigation and question-map element IDs are absent.
- CSS parser reported no errors.
- ZIP integrity test performed after packaging.

Note: A live hosted-browser/mobile-device test has not been performed in this environment. Existing HPT video files are not embedded in this website ZIP; keep the separately hosted video library/configuration as before.
