HPT V147 — SCHOOL LOGO TRANSPARENT DISPLAY

INSTALLATION (PATCH)
1. Extract HPT-V147-School-Logo-Transparent-Patch.zip.
2. Open the inner hazard-perception-test folder.
3. Copy its files into your existing GitHub repository folder and allow overwrite.
4. Commit and push to main.
5. Reopen the website with Ctrl+F5 after deployment.

WHAT CHANGED
- Removed the extra white circular frame and white backing around the school logo on the welcome splash.
- Removed added border, shadow, padding and circular clipping from the logo image.
- The school's uploaded logo is now displayed as-is, retaining any background or transparency that is part of the actual image file.
- Updated the CSS cache version to v147.
- Preserves V146's simple welcome design and minimum 6.5-second display duration, V143 desktop/mobile background images, Malayalam font support and other existing website features.

IMPORTANT
This removes only the extra styling added by the website. If a particular uploaded logo file itself contains a white background, that white area is part of the image and is intentionally preserved because the logo is displayed unchanged.

NO SUPABASE SQL, EDGE FUNCTION OR R2 CHANGES REQUIRED.

Validation performed: CSS syntax/brace checks, HTML reference checks and ZIP integrity. Live browser appearance should be confirmed after deployment.
