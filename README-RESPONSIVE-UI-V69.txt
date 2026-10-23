RESPONSIVE UI BASELINE — V69

This package preserves the uploaded multi-school Hazard Perception Test application as the working baseline and applies a presentation-only responsive UI pass.

UI improvements:
- Improved school access-code screen layout and text/input readability on phones and short screens.
- Restored readable candidate-home introduction on mobile and increased minimum text sizes.
- Improved form labels, touch targets, contrast, wrapping, safe-area spacing, and vertical scrolling where needed.
- Improved exam overlay/timeline controls and result/attempt dialogs on small devices.
- Improved responsive readability and touch spacing in the admin/manager UI.
- Restored browser pinch-zoom support by removing viewport zoom restrictions.
- Updated CSS cache version parameters so browsers request the revised stylesheets.

No JavaScript, scoring, access-code validation, Supabase/database, school branding, video assets, or exam workflow logic was changed. Bootstrap was already present; no additional plugins were introduced.

Use this ZIP as the responsive-UI baseline. Keep a copy of the previous ZIP as a rollback option.
