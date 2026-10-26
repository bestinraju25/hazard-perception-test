V77 — Responsive School Landing Page, School Leaderboard & Certificate Score Protection

Included:
1. Responsive split-screen landing page:
   - Existing schools: School Login, Access Code and Start Test.
   - New schools: Register inquiry card with WhatsApp CTA to +91 89437 64734.
   - Mobile layout stacks the cards vertically.
2. SEO:
   - Updated title, meta description, target keyword metadata, canonical URL.
   - Open Graph and Twitter share metadata for hazardperceptiontest.co.in.
   - Semantic H1/H2 structure and three short SEO paragraphs below the login cards.
   - WebSite JSON-LD.
3. Top Scorers Spotlight:
   - Shown on the authenticated school's candidate home screen below Candidate Details.
   - School-scoped via the verified school access code.
   - Deduplicates attempts by mobile number and retains each student's best score.
   - Tie-breaks equal scores by faster average reaction time, calculated from hazard timestamps.
   - Shows up to 10 students, with podium medals for the top three.
   - Refreshes after an exam is saved and when returning to the start screen.
   - Uses a SECURITY DEFINER RPC which returns only display names, scores and reaction averages. It does not expose phone numbers or grant public read access to candidate records.
4. Certificate score protection:
   - Prevents browser click events from being mistaken for exam data.
   - Removes the duplicate direct onclick assignment; retains the safe event listener.

IMPORTANT DATABASE STEP FOR LEADERBOARD:
Before the leaderboard can display, run:
  10-school-leaderboard-rpc.sql
in Supabase Dashboard > SQL Editor for the same project used by this site.
This creates the narrowly scoped hpt_school_top_scorers RPC. It does not change existing records, scoring, school access codes, or RLS policies.

DEPLOY:
- Upload/replace the complete contents of this ZIP in the existing GitHub Pages repository (retain the repository's current root structure).
- Commit and push to the publishing branch.
- Run the SQL migration above once in Supabase.
- Hard refresh the website (Ctrl+F5) or clear the mobile browser cache.

NOTES:
- WhatsApp inquiry link uses wa.me/918943764734 and a prefilled registration message.
- SEO improvements help search engines understand the page but cannot guarantee a #1 ranking.
- Existing exam scoring and school verification logic are not changed.
