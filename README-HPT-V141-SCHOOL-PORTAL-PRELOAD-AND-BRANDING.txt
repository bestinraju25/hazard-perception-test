HPT V141 — SCHOOL HOMEPAGE PRELOAD & BRANDING

INSTALLATION (PATCH)
1. Extract the V141 patch ZIP.
2. Copy the contents of the hazard-perception-test folder into your existing GitHub repository folder.
3. Allow the four updated files (index.html, app.js, hpt-experience.js and hpt-experience.css) to replace the old versions.
4. Commit and push to the main branch.
5. Once GitHub Pages/your deployment finishes, close the old tab and reopen https://www.hazardperceptiontest.co.in/ .

WHAT CHANGED
- Removed the large guide link directly under the public access-page heading. The dedicated Kerala guide page remains in the project, sitemap and lower page SEO content.
- Increased the school logo on the welcome/loading overlay.
- Increased the driving-school logo size on the school portal header and mobile school identity section.
- During school login, the logo, school portal background, road-screen assets and school leaderboard data are prepared while the branded welcome/loading screen is visible.
- The real school homepage is now shown behind the loading overlay before the overlay fades away. This avoids showing the previous access page for a frame, then abruptly switching to the school homepage.
- Saved/restored school sessions also wait for portal preparation before revealing the page.

NO SUPABASE SQL, EDGE FUNCTION OR R2 CHANGES ARE REQUIRED.

TEST
1. Open the site in a fresh tab.
2. Enter a valid school access code.
3. Confirm the school welcome screen shows the enlarged school logo.
4. When the welcome screen fades, the school homepage should already be visible underneath with its branding and leaderboard ready, without a visible jump.
5. Refresh after a school has been selected; the restored session should load smoothly too.
6. Confirm the guide link is no longer shown below the public heading. The dedicated SEO guide URL should still work.

Validation performed: JavaScript syntax checks, HTML IDs, CSS brace balance, archive integrity and preservation of the SEO guide page/sitemap. The live deployment still needs a browser test on your device.
