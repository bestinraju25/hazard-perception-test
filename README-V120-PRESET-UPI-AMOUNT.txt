V120 — PRESET UPI PAYMENT AMOUNT
================================

Updated the school registration payment screen to use the newly supplied Google Pay QR.
The QR payload opens a UPI payment request to bestinraju25-2@oksbi with INR 5,000.00 prefilled.
The payment page now displays the same UPI ID and fixed amount.

No database migration is required for this QR/image and display-only update.
The Payment Completed button still submits a customer confirmation only; it does not verify
bank receipt or activate a school. Continue to check the payment manually before enabling a school.

Replace the existing deployed project files with this ZIP while retaining your separate videos/ folder.
