RAJU HPT v21 - Candidate Access Code

Candidate side:
- Adds Access Code field to the start screen.
- Default code is 1234 after the SQL migration is run.
- Wrong code shows ACCESS CODE DENIED and the exam does not start.
- Access-code verification is performed through a Supabase RPC; the stored code is not exposed to anonymous candidates.
- Response confirmation beep is louder than v20.

Admin side:
- Adds a compact Exam Access Code setting after login.
- Admin can change the candidate access code at any time.
- Video upload/edit/delete, hazard marking, results, certificates, and seminar functionality are otherwise unchanged.

IMPORTANT: Run supabase-hpt-v21-access-code.sql once in the Supabase SQL Editor.
