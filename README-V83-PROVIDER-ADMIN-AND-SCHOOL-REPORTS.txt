V83 — PROVIDER ADMIN, SCHOOL REPORTS, DISABLED ACCESS AND SCHOOL INQUIRY

1. Provider-neutral admin identity
- Removed Raju Motor Driving School branding from the admin header and sign-in panel.
- Admin panel now identifies itself as the Hazard Perception Test Provider Control Centre.
- Existing authorized admin_users authentication is retained; no authentication account or password was changed.

2. School-wise candidate operations and exports
- Candidates & Results now supports school filter, pass/fail filter, name/mobile search and date filters (this week, this month, last month, last 30 days).
- A student CSV export downloads the filtered records, including school, name, phone, score and status.
- Weekly or monthly performance export summarizes attempts, unique students, passes, failures, pass rate, average score and highest score.
- The Driving Schools registry has a REPORTS action for each school. It opens Candidates & Results already filtered to that school.
- Existing VIEW, REPORT, PRINT and DELETE actions remain available for each candidate attempt.

3. Disabled school message (requires SQL migration)
- Added 11-provider-admin-and-school-status-v83.sql.
- Run this once in Supabase SQL Editor. It replaces verify_hpt_school_access_code with a status-aware response.
- Active codes continue to work. Disabled codes display: “HAZARD PERCEPTION TEST DISABLED. PLEASE CONTACT THE PROVIDER TO CONTINUE USING THE SOFTWARE.”
- Unknown codes display a separate code-not-recognized message.

4. WhatsApp school enquiry form
- The public landing page now asks for Driving School Name, Contact Number and Location.
- Send Inquiry via WhatsApp creates a preformatted enquiry message to +91 89437 64734.
- All three fields must be entered before WhatsApp opens.

5. National-facing wording and Kerala-focused SEO
- Visible page title and H1 now say “Hazard Perception Test” without the state name.
- Metadata retains relevant Kerala search terms while keeping the public wording suitable for customers in other regions.

DEPLOYMENT
A. Upload all project files to the existing GitHub Pages repository and commit to the publishing branch.
B. In Supabase Dashboard > SQL Editor, run 11-provider-admin-and-school-status-v83.sql once.
C. Hard-refresh the public site and admin page (Ctrl+F5 / clear mobile cache).
D. Sign in to the provider control centre, open Driving Schools > REPORTS on a school, and test student CSV and weekly/monthly performance exports.

DATA AND SECURITY
- Results are still read by the existing active provider administrator role (admin_users.active). This does not create per-school login accounts.
- The provider can filter data by school. Individual student actions remain available inside the filtered school view.
- The new public access RPC returns only the school identity/branding for active codes, a disabled status for inactive schools, or not_found. It does not return inactive school details.
- No candidate records or school records are deleted or modified by this frontend update or migration.
- The legacy RAJU DRIVING SCHOOL school row, if present from the original install migration, is retained as one registered customer school. Only the provider admin branding is made neutral.
