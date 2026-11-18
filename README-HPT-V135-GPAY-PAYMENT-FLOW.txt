HPT V135 - GOOGLE PAY PAYMENT FLOW

Built on HPT V134. This update changes only the school-registration payment screen.

WHAT CHANGED
- Removed the payment QR code from the registration payment screen.
- Added CONTINUE TO GPAY. On Android, this launches Google Pay using a UPI intent with:
  Payee: Bestin Raju
  UPI ID: bestinraju25-2@oksbi
  Amount: INR 5,000.00
  Note: Hazard Perception Test School Registration - [school name]
- Added PAYMENT COMPLETED. After returning from GPay, the customer taps this button.
- The existing confirm_hpt_school_payment RPC is still called. On success, the registered four-digit access code is displayed.
- Payment is NOT automatically verified. The school remains pending/inactive until the administrator manually checks the bank/GPay receipt and approves/enables it in the admin panel.

INSTALLATION
1. Keep your existing V134 files and Supabase setup.
2. Extract HPT-V135-GPay-Payment-Flow-Patch.zip into the repository root, allowing it to overwrite the included files.
3. Commit and push to GitHub main.
4. Wait for GitHub Pages deployment, then hard-refresh the registration page on a phone.

NO DATABASE MIGRATION OR EDGE FUNCTION CHANGE IS REQUIRED.

TEST
1. Open the website on an Android phone with Google Pay installed.
2. Start a test school registration and submit the details.
3. Tap CONTINUE TO GPAY. Verify Google Pay opens with Bestin Raju, the UPI ID and INR 5,000 prefilled.
4. Return to the website and tap PAYMENT COMPLETED.
5. Verify the access code is displayed and the registration remains pending approval in the admin panel.

NOTES
- The GPay deep link requires a compatible Android device and Google Pay installed. If the app is unavailable, the device may show an app/UPI handler error; this is not proof of payment.
- Tapping PAYMENT COMPLETED is only a customer declaration. Always verify receipt independently before approving the school.
