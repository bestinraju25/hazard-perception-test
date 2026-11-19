HPT V149 — ADAPTIVE SCHOOL LOGO DISPLAY

WHAT CHANGED
- Corrects the uneven visual size of school logos on the scenic welcome screen.
- Logo display dimensions are calculated from each uploaded image's natural width/height ratio.
- Wide wordmarks receive a wider display area; square crests remain balanced; portrait logos keep their proportions.
- The source logo artwork is not stretched, cropped, recoloured, or placed on a white backing.
- Preserves V145 simple welcome design, V146 minimum 6.5-second display, V147 transparent logo treatment, V143 backgrounds, V148 Driving Schools India information page, and the rest of V148.

INSTALLATION — PATCH
1. Extract HPT-V149-Adaptive-School-Logos-Patch.zip.
2. Copy the included files into your existing GitHub repository root, allowing overwrite.
3. Commit and push to main.
4. After deployment, reopen the website with Ctrl+F5 on desktop or clear the browser tab/cache on mobile.

FILES IN PATCH
- index.html (cache-busting version references)
- hpt-experience.js (dynamic image aspect-ratio sizing)
- hpt-experience.css (welcome-logo layout)

NO SUPABASE SQL, EDGE FUNCTION, OR R2 CHANGES REQUIRED.

VALIDATION
JavaScript syntax, HTML structure, CSS brace balance, local references, and ZIP integrity checked. Please test with one wide wordmark logo and one square/circular school logo on desktop and mobile.
