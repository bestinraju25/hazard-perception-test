HPT V137 — Install and Test

WHAT CHANGED
1. PAYMENT COMPLETED now appears as a large, prominent green button with a clear check icon and arrow.
2. Before the user opens GPay, the button remains disabled but still looks like a button and tells the user how to unlock it.
3. After the user taps CONTINUE TO GPAY, the button becomes active. When the user returns after paying, they tap PAYMENT COMPLETED to submit the confirmation and display the four-digit access code.
4. The page advises customers to select their regular linked bank account, not UPI Lite, because UPI Lite has a lower per-transaction limit.
5. The CSS and JS references in index.html are cache-busted to v=137.

INSTALLATION
- Extract this patch into the existing GitHub repository root (the folder containing index.html), allowing files to be replaced.
- Commit and push to main.
- Wait for GitHub Pages deployment. On the phone, close the old registration page tab and reopen the site.

FILES IN PATCH
- index.html
- school-registration.js
- school-registration.css
- VERSION-V137.txt
- this README

PAYMENT LIMIT NOTE
The website cannot override limits set by Google Pay, UPI Lite, or the payer's bank. Google Pay currently documents UPI Lite as up to ₹1,000 per transaction and a ₹5,000 total balance/limit, while Google Pay also describes a ₹5,000 cumulative limit for the first 24 hours after adding a bank account on Android. Bank-specific limits can differ. If a regular bank-account payment still fails, the payer must check their Google Pay/bank limit or contact their bank.

The website does not verify receipt of funds. The customer confirmation only marks payment as customer-confirmed; administrator manual verification before approval remains in place.
