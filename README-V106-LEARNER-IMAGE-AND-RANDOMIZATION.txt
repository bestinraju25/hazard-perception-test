HPT ONLINE WEBSITE - V106 QUESTION IMAGE AND MOCK RANDOMIZATION FIX

Changes:
1. Refreshed all 97 image-based learner question illustrations from the original official Kerala Transport Department English LLTEST PDF (generated 06-10-2025). The sourcePage and row order in the official question-bank JS were used to locate each PDF image. No AI-generated replacement images were used because the PDF contained the relevant source illustrations.
2. Replaced prior inconsistent/partial raster assets with question-cell crops rendered at 300 DPI. Cropping removes only table borders and surrounding margins; complete illustrations are retained with a white safety margin.
3. Updated exam and answer-review image styling to use intrinsic sizing with object-fit:contain, preventing forced cropping.
4. Mock exams now draw 30 questions from a persistent shuffled deck per school, student and language. The last 60 question IDs are excluded from the next deck draw, so the previous two 30-question mock sets are not repeated immediately when a full bank is available. The selection history stores only question IDs in that browser's local storage; no attempt answers, scores or student answers are persisted by this feature.
5. Practice still presents the full question bank in a newly shuffled order at each start. All 200 question entries, option wording, correct-answer indexes and bilingual entries are preserved.

No Supabase schema change is required. Existing HPT attempts and learner score aggregate/profile logic are unchanged.

Verification: 97/97 image questions have corresponding refreshed PDF-derived assets; image/question IDs are unchanged; JS syntax and ZIP integrity validated.
