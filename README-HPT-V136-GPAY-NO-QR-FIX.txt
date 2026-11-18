HPT V136 — GOOGLE PAY PAYMENT FLOW FIX (NO QR CODE)

WHY THIS FIX WAS NEEDED
V135 updated school-registration.js but index.html still referenced school-registration.js?v=134. Some browsers therefore continued to use their cached V134 registration script, which still rendered the QR payment screen.

WHAT V136 CHANGES
- index.html now references school-registration.js?v=136 and school-registration.css?v=136 to force a fresh load.
- The payment screen visibly presents the requested three-step flow:
  1. CONTINUE TO GPAY — opens Google Pay with Bestin Raju, bestinraju25-2@oksbi, and ₹5,000.00 prefilled.
  2. PAYMENT COMPLETED — enabled after the user taps CONTINUE TO GPAY; returns here after paying and taps the button.
  3. ACCESS CODE DISPLAYED — the 4-digit access code is displayed after the payment-completed declaration is accepted.
- No QR code is rendered on the payment screen. The obsolete QR image asset and QR-specific CSS have been removed from the complete package.
- Manual payment verification and manual school approval remain unchanged. Customer tapping PAYMENT COMPLETED is not proof that the money was received.

INSTALLATION — IMPORTANT
1. Extract this patch into the root of the GitHub repository and allow files to be overwritten.
2. Make sure index.html is included in the commit. It changes the registration script/style version strings; without this file, a browser can continue loading the old cached registration script.
3. Commit and push to main.
4. Wait for the GitHub Pages deployment to finish.
5. On the phone, close the old site tab, open the website again, and hard refresh if needed. The updated page should show the green CONTINUE TO GPAY button and no QR image.
6. Optional cleanup: delete assets/gpay-payment-qr.png from an existing repository if that old unused file is still present. It is no longer referenced by the updated payment flow.

PAYMENT DETAILS
Payee: Bestin Raju
UPI ID: bestinraju25-2@oksbi
Amount: INR 5,000.00
The UPI intent is targeted at Google Pay on Android. Actual payment is completed inside the GPay app. The PAYMENT COMPLETED button only records the customer's declaration; the provider must verify the receipt separately before enabling the school.

NO SUPABASE SQL MIGRATION OR EDGE FUNCTION CHANGE IS REQUIRED.
