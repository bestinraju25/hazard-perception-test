RAJU HPT v48 – result saving fix

IMPORTANT: Run supabase-hpt-v23-results-reliability.sql once in Supabase SQL Editor.

Why the previous version failed:
The original hpt_responses table allowed awarded_marks only from 0 to 5.
Single-hazard clips can award up to 10. When a candidate received more than 5
marks for a single hazard, the database rejected that response and the entire
hpt_record_attempt transaction rolled back. The result page therefore showed
“Result could not be recorded automatically.”

This migration changes the response constraint to 0..10 and recreates the RPC.
Existing two-hazard scoring remains 5+5 per clip.
