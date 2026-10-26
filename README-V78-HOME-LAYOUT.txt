V78 — School Home Screen Layout & Branding Update

Changes in this update:
- School logo and school name are now in the main top header, not floating over the candidate form.
- Header branding is larger and remains fixed/sticky at the top while the school homepage scrolls.
- Mobile header stacks logo, school name and Hazard Perception Test label centrally above the home controls.
- Desktop/laptop school homepage uses a two-column layout:
  * Left: examination stats and How it works at the top, school leaderboard below.
  * Right: Candidate Details / Start Exam card.
- Desktop leaderboard is condensed to the top five performers so the main home screen fits the laptop viewport without requiring page scrolling.
- Mobile keeps the full leaderboard and allows natural vertical scrolling.

Existing school login, exam, scoring, leaderboard data retrieval, and certificate logic are unchanged.

DEPLOY:
Replace the existing repository files with the contents of this ZIP and commit/push to the existing publishing branch. No Supabase SQL migration or configuration change is required for this visual update.
After deployment, hard-refresh the site (Ctrl+F5) or clear the mobile browser cache.
