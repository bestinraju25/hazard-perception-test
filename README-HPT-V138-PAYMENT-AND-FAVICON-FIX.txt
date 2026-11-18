HPT V138 — PAYMENT GUIDANCE + FAVICON FIX

Changes:
- Replaced the stale favicon reference with fresh versioned HPT logo favicon assets (192px and 512px).
- Updated the web app manifest icon references and cache version.
- Bumped the registration script cache version to v138.
- UPI transaction note spaces are now encoded as %20 rather than + for cleaner display in payment apps.
- Added clear guidance that a bank-side UPI limit rejection cannot be bypassed by the website; users should try another eligible linked bank account or contact their bank. The access-code confirmation must only be submitted after a successful payment.

Important payment note:
The supplied screenshot shows GPay correctly opening with the correct payee, UPI ID and ₹5,000 amount. The red warning is a bank-limit decline. Website changes cannot override Axis Bank or account-level UPI limits. Keep the registration fee at ₹5,000; use another eligible bank account or ask the bank to clarify the limit.

Install: extract the patch into the existing GitHub repository, overwrite the files, commit and push to main. No Supabase migration or Edge Function redeployment is required. After deployment, close old tabs and reopen the site. If Chrome still shows the old icon, clear the site's cached data or wait for favicon cache refresh.
