V109 – LEARNERS MOCK TEST DARK THEME & RESULT UI

This update is based on the V108 Learners Mock Test audio/timer package.

Changes:
1. Fixed low-contrast selected answers in Answer Review. The review renderer uses
   the `chosen` class; V109 styles that class with a dark amber background and
   light text. Correct answers remain clearly marked in green.
2. Reworked the Answer Review dialog footer to match the dark theme.
3. Added a slim dark scrollbar to the Answer Review list, with matching Chrome/
   Edge scrollbar styling and Firefox scrollbar colours.
4. Redesigned the Learners Mock Test result screen with a modern dark report card,
   pass/fail status, score progress bar, visible 18/30 pass threshold, four result
   metrics, and clearer action buttons.
5. Improved mobile layout for the result screen and answer review dialog.
6. Bumped learner-test assets and the parent learner iframe cache version to V109.

Preserved:
- 30-second per-question timeout and automatic advance.
- 15-minute overall mock exam time limit.
- Neutral answer-selection tone and countdown ticking sound.
- Final-seconds countdown warning/shake animation.
- Existing question selection, scoring, result saving, and school access logic.

Files changed:
- learner-test.html
- learner-test.css
- learner-test.js
- index.html (learner iframe cache key)

Validation performed:
- JavaScript syntax check (Node.js)
- HTML parser check for learner-test.html and index.html
- CSS brace-balance check
- ZIP archive integrity check

Note: A full interactive browser test was not completed as headless Chromium
failed to start correctly in the build environment. Please test the deployed
result page and answer review once on desktop and once on Android.
