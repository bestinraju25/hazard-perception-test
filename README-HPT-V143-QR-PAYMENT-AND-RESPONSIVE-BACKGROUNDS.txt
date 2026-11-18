HPT V143 INSTALLATION — QR PAYMENT + RESPONSIVE BACKGROUNDS

1. Extract HPT-V143-QR-Payment-Responsive-Backgrounds-Patch.zip.
2. Open the extracted hazard-perception-test folder.
3. Copy its files into the root of your existing GitHub repository, allowing overwrite.
4. Confirm that index.html, learner-test.html, style.css, hpt-experience.css, learner-test.css, school-registration.css and school-registration.js were replaced.
5. Confirm the new assets folder files were copied.
6. Commit and push to main.
7. After deployment, close old site tabs and reopen the website. On Android, refresh the page or clear the browser cache if an old version remains visible.

PAYMENT FLOW
- Customer completes school registration.
- Payment page displays the supplied QR image.
- Customer scans it with any UPI app and enters ₹5,000. The QR itself does not encode a fixed amount.
- Customer can download the QR image.
- After successful payment, customer ticks the payment confirmation checkbox and selects GET ACCESS CODE.
- The website records customer confirmation in the existing confirm_hpt_school_payment RPC and displays the four-digit code.
- This is not automatic bank verification. The school remains inactive until the administrator verifies payment and enables the school. Activation may take up to 6 hours after registration.
- WhatsApp help remains 8943764734. The customer must manually attach their payment screenshot in WhatsApp.

QR DETAIL
The supplied QR decodes to UPI ID bestinraju25-2@okicici. This replaces the older @oksbi ID in the registration payment screen.

BACKGROUND IMAGES
- Desktop/laptop: assets/hpt-bg-desktop-v143.webp
- Mobile/small screens: assets/hpt-bg-mobile-v143.webp
- These are optimized WebP copies of the two uploaded source images.

NO DATABASE MIGRATION IS REQUIRED. Existing Supabase RPCs, school registrations, push notifications, admin approvals, R2 videos, exams, reports and SEO guide remain unchanged.
