V102 — FULLSCREEN PERSISTENCE

Changes:
- Learner Mock Test opens inside the parent HPT fullscreen shell.
- Returning from the learner test no longer calls document.exitFullscreen().
- Learner result screen and answer-review popup remain inside the same fullscreen iframe.
- Fullscreen toggle controls are hidden to avoid accidental exits.
- If the browser/OS exits fullscreen (for example, Escape or a system gesture), a clear tap-to-resume control appears. Browsers require a fresh user gesture to re-enter fullscreen; websites cannot override that security restriction.

No database migration is required. Existing HPT and learner result storage are unchanged.
