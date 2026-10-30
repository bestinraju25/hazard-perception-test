HPT ONLINE WEBSITE - LEARNER TEST RESPONSIVE FIX (V94)

Changes in V94:
- Corrected HTML hidden-state handling so the countdown timer is not displayed in Learner Practice.
- The 15-minute countdown is displayed only while a Mock Examination is running; it is hidden on the setup and result screens.
- Constrained the exam page to the visible viewport and made the question panel use the available remaining height.
- Reworked mobile header, progress row, image area, answer cards, navigation buttons and question-number strip for narrow screens.
- Added compact layout rules for smaller-height phones and landscape phone orientation.
- Hides the Practice/Mock switcher during an active question session to give the question more screen space. It reappears when the session ends or the user returns to setup.
- Preserves school-name, school-logo and school-colour branding from the existing school session.
- Existing official HPT module and question bank content were not modified in this layout-only fix.

Deployment:
Replace the existing website files with the contents of this ZIP using the same folder structure. Test on the live HTTPS website after deployment, since local file:// testing and browser-specific viewport bars can differ from the real hosted experience.
