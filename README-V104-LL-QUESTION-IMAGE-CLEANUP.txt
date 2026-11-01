HPT ONLINE WEBSITE — V104 LEARNER QUESTION CLEANUP

Based on the four annotated desktop screenshots supplied on 1 November 2026.

Changes:
1. Corrected English option text for MVD question 1099: "Gapin median" -> "Gap in median".
2. Corrected English option text for MVD question 1402: "Menat work" -> "Men at work".
3. Removed the source MVD question ID label (e.g. QUESTION 1099 / QUESTION 1425) from the active exam display. The candidate already sees the running exam question count (e.g. Question 17 / 30). The source ID is retained in the bank and result payload for data traceability.
4. Removed source MVD question ID from the learner-facing answer-review cards; sequential attempt numbering remains.
5. Processed the 312 learner question-image PNG assets to reduce excess white page margins, enlarge the subject within the available image panel and make the small source thumbnails display more clearly. All images retain their aspect ratio and are displayed with object-fit: contain. The source images are low-resolution PDF thumbnails, so upscaling improves their on-screen size but cannot recreate missing detail.
6. Updated cache-busting versions to V104 for learner HTML/CSS/JS/question bank and the portal iframe URL.

Validation:
- English and Malayalam question counts remain 200 each.
- Correct answer indexes and question IDs remain unchanged.
- All referenced learner image paths were checked.
- All PNG assets were checked for valid image data.
- JavaScript syntax, HTML unique IDs and CSS parsing were checked.
- Complete website ZIP integrity was checked.
