V113 — MOBILE EXAMINATION SPACING & TIMER VISIBILITY

Changes
- Safe top/bottom spacing now applies to the HPT candidate examination, not the public school-access / landing page.
- HPT mobile exam header is deliberately compact and horizontal. The countdown HUD is restored on mobile and the timer is larger and easier to read.
- HPT clip/timer header, top overlay and bottom controls are kept within the examination's safe viewport.
- Learners safe-area spacing is applied only while an examination is active; setup and landing/access views retain their original full-height layout.
- Learners progress row and question panel are positioned just below the safe header rather than vertically centering the whole question block too far down the screen.
- Learners timer labels and both countdown values are larger on mobile, with narrower-screen adjustments.
- Added mobile-only short-screen handling. Desktop layout, examination scoring, question timing, audio and Supabase logic are unchanged.

Deployment
Upload the complete website folder from this ZIP. No Supabase migration or database changes are required.
