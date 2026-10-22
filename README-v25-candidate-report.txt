RAJU HPT v25 — Candidate report download

The My HPT Attempts screen now provides DOWNLOAD REPORT for every completed attempt,
regardless of pass/fail status. PASS attempts retain DOWNLOAD CERTIFICATE as a separate action.

Supabase:
Run supabase-hpt-v25-candidate-report.sql once in the Supabase SQL Editor.
This extends hpt_get_candidate_attempts() with the stored clip order and response details
needed to regenerate the analysis PDF.

The PDF is generated locally in the browser using the current card-style report generator.
Extra/unmatched clicks remain excluded from the report, and no clip numbers are shown.
