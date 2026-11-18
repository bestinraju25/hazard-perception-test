HPT V139 — WHATSAPP PAYMENT HELP OPTION

WHAT CHANGED
- Adds a clear “UNABLE TO MAKE PAYMENT?” WhatsApp enquiry card to the ₹5,000 registration payment screen.
- Opens a WhatsApp chat with 8943764734 and a prefilled message explaining that the customer could not complete payment.
- Instructs the customer to manually attach their GPay/UPI payment error screenshot in the WhatsApp chat. Websites cannot silently attach a screenshot from the customer's phone to a WhatsApp message.
- Updates registration CSS/JS cache versions to v139.
- Does not change the ₹5,000 amount, UPI ID, payment confirmation RPC, access-code flow, or manual school approval.

INSTALL
1. Extract the patch into the existing GitHub repository root, preserving the hazard-perception-test folder structure.
2. Replace the included index.html, school-registration.js and school-registration.css.
3. Commit and push to main.
4. After deployment, reopen the registration page or hard-refresh it.

TEST
Open school registration, proceed to payment, and tap “UNABLE TO MAKE PAYMENT?”. WhatsApp should open the chat with 8943764734 and a prefilled enquiry. Attach the payment failure screenshot manually before sending.

No Supabase SQL migration or Edge Function deployment is required.
