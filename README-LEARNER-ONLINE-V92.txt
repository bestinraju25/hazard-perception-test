HPT ONLINE WEBSITE - LEARNER TEST RESPONSIVE UPDATE

Included:
- Learner Practice and 30-question Mock Examination page, using the existing Kerala MVD question-bank package bundled with the Manager's LL redesign.
- Separate English and Malayalam display modes.
- Image-question support using local question assets.
- Responsive desktop/tablet/mobile layouts modelled on the supplied exam UI references.
- Learner Test launcher in the school portal home tools; requires an existing hpt_school_session.
- Removed Play Game launcher, game access-code modal, Unity/game pages and game source folders.

Important deployment note:
This package adds the learner exam UI and local browser-side question workflow. It does NOT yet add secure server-side learner result storage or a Supabase learner-results schema. Do not treat browser-only mock results as authoritative school records. HPT official exam tables/workflows are not modified.

V95 mobile layout update: question text is larger and unclamped; mobile answer options use consistent compact content-based sizing rather than stretching to fill the panel. Image questions retain a compact image area and visible answer list.

V96 UPDATE: Added a four-digit learner-module entry screen. The code is 4734. The gate appears before the Learner’s Test landing screen and inherits the current school logo/name. Existing school session validation remains required. This is a front-end convenience gate only; the code is present in browser JavaScript and is not secure against technical users inspecting the files.
