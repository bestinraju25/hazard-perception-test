HPT ONLINE WEBSITE - LEARNER TEST UI UPDATE V97

Changes in this build:
- Learner’s Test opens as a full-viewport iframe layer from the school portal, rather than navigating away from the portal document. This preserves an existing HPT fullscreen session. The launch click also requests fullscreen if the portal is not already fullscreen.
- The verified school session is passed securely to the same-origin learner frame through postMessage (not in the URL), with a storage fallback for local-file browsers. School name, logo and colour branding continue to apply.
- Learner access code 4734 remains required. If the browser exits fullscreen, a fullscreen re-entry control is shown. Browser security does not allow websites to block the user’s Escape key or silently force fullscreen without a user gesture.
- Mock setup no longer displays the full question-bank size; it displays only 30 questions, 15 minutes and the 18/30 pass mark. The full question-bank count is reserved for Practice.
- Redesigned mock result card with visible score, status, result statistics, retake action and return-to-practice action.
- Mobile question layout balances the prompt and compact answer choices; image questions retain a dedicated image area. Bottom actions use short mobile labels, and all 30 mock question markers are shown in a 10-by-3 grid.
- Practice mode has no timer. Mock mode alone has a 15-minute timer.
- The child page's Exit control closes the learner overlay and returns to the existing portal without resetting the school session.
- Existing official HPT assets, videos, workflows, question bank and school branding files are retained.

Important: learner mock scoring/results are still browser-side only; this UI update does not add secure Supabase learner-result persistence.
