HAZARD PERCEPTION TEST — V118 STATE-BASED TEST AVAILABILITY UPDATE
=======================================================

This is the updated project package based on the uploaded base ZIP. Existing HPT
exam functionality, learner mock test, reports, leaderboards, school login, videos
management and other existing project files are preserved.

WHAT WAS ADDED
--------------
1. Landing page now has Get Access Code instead of the WhatsApp enquiry form.
2. Registration collects school name, location, contact number and school logo.
3. Continue to Payment displays ₹5,000 and the supplied static GPay/UPI QR.
4. UPI ID displayed: bestinraju25-2@oksbi.
5. Payment Completed records the customer's confirmation and displays a unique
   four-digit school access code. No transaction ID or payment screenshot is collected.
6. The new school is created as inactive and pending approval. Its code cannot
   enter HPT until you manually enable it.
7. Forgot Access Code looks up the registered mobile number and displays matching
   school code(s) directly; OTP is not used.
8. Admin → Driving Schools highlights pending registrations and customer payment
   confirmations. Clicking ENABLE asks you to independently confirm receipt in
   GPay/bank account, then approves the registration and enables the school.

SUPABASE SETUP — REQUIRED ONCE
------------------------------
1. Open your Supabase project dashboard.
2. Open SQL Editor.
3. Run the new file: 19-school-registration-static-upi.sql
4. Confirm the final verification query reports both RPCs and both status columns
   as true.
5. For the state-based feature, run 20-indian-states-and-kerala-only-learners-test.sql AFTER migration 19.
6. Do not rerun the earlier full installer just for this feature. Both migrations are additive
   and do not delete existing schools or examination records.

DEPLOYMENT
----------
1. Extract this ZIP. The project files are at the top level of the extracted folder.
2. Upload/commit the updated project files to the same GitHub repository/branch used
   by the live HPT website.
3. Keep the existing hpt-config.js and Supabase project settings unchanged.
4. Deploy the same folder to the existing GitHub Pages site.
5. Clear browser cache or use a private window for the first test.

TEST CHECKLIST
--------------
- Open the landing page and confirm Get Access Code appears instead of WhatsApp.
- Register a TEST driving school with a valid logo.
- Confirm the payment page shows the supplied QR and UPI ID.
- Click Payment Completed and confirm a four-digit code appears with Pending Approval.
- Try the code before admin approval: it must be rejected as disabled.
- In Admin → Driving Schools, verify the pending badges are visible.
- Check the payment separately in GPay/bank account. Only then click ENABLE and
  confirm the payment prompt.
- Try the same code again: it should allow access after activation.
- Test Forgot Access Code using the registered mobile number.

IMPORTANT PAYMENT LIMITATION
----------------------------
The QR supplied is static. A static QR plus a browser button cannot independently
verify whether money was received. Payment Completed records only the customer's
claim that payment is complete. Admin will see that claim, but must independently
verify receipt in GPay/bank account before enabling the school. No transaction ID
or payment screenshot is collected.

DIRECT ACCESS-CODE RECOVERY
---------------------------
As requested, recovery uses the registered mobile number without OTP. Anyone who
knows that number may retrieve its associated access code(s). Please consider this
trade-off when sharing school contact numbers.

PACKAGE CONTENTS
----------------
This ZIP intentionally excludes all videos/ and .git/ content to keep its size low.
The video paths and existing video management code are retained; the videos folder
should be preserved in your existing clone/deployment as a separate asset folder.

Version: V118 — Indian State Selection / Kerala Learner Test Eligibility / HPT for Other States


V118 STATE-BASED TEST AVAILABILITY
--------------------------------
1. Run 20-indian-states-and-kerala-only-learners-test.sql in Supabase AFTER migration 19.
2. New school registration now requires State / Union Territory. The form includes all 28 Indian states and all 8 Union Territories.
3. Existing schools are assigned Kerala by migration because the existing registered schools are Kerala schools. Their learner test choice remains available.
4. Kerala school login: Continue opens the existing choice between Hazard Perception Test and Learner's Mock Test.
5. Schools in every other state / UT: Continue starts the Hazard Perception Test directly. The Learner's Mock Test choice is not shown or available.
6. Admin > Driving Schools now displays state and lets the admin select it when adding/editing a school.

The learner-test restriction is enforced in app.js and learner-test.js based on the state returned by the access-code verification RPC. Directly opening the learner-test page for a non-Kerala school is blocked as well.
