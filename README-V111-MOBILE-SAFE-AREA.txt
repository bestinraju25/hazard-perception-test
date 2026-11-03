V111 — MOBILE SAFE-AREA & TOP/BOTTOM SPACING

Changes
- Added one shared mobile-safe-area.css stylesheet across the main HPT portal, provider admin, Learners Test, Drive Yourself, and school statistics pages.
- Added mobile-only top and bottom breathing room that accounts for device safe-area insets.
- Main HPT stage and Learners Test shell are reduced to fit inside the safe area, rather than allowing headers or footers to sit at the physical screen edge.
- Added safe padding to access and review dialogs.
- Desktop layout and existing exam logic are unchanged.

Deployment
Upload the complete website folder from this ZIP, keeping the current Supabase configuration and database unchanged. The added stylesheet is referenced by the five main HTML pages.
