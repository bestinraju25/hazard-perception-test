@echo off
setlocal
cd /d "%~dp0"
echo ================================================
echo HPT - Deploy Supabase video publishing function
echo Project: nceufqdvuuztdfyesbxx
echo ================================================
echo.
if not exist "supabase\functions\hpt-publish-video\index.ts" (
  echo ERROR: Run this file from the extracted hazard-perception-test folder.
  pause
  exit /b 1
)
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is required for npx. Install Node.js, reopen this window, and try again.
  pause
  exit /b 1
)
echo First, sign in to Supabase in the browser that opens.
npx --yes supabase@latest login
if errorlevel 1 goto failed
echo.
echo Linking this local project to the existing Supabase project...
npx --yes supabase@latest link --project-ref nceufqdvuuztdfyesbxx
if errorlevel 1 goto failed
echo.
echo Deploying updated hpt-publish-video (GitHub upload + full video library sync)...
npx --yes supabase@latest functions deploy hpt-publish-video --project-ref nceufqdvuuztdfyesbxx --no-verify-jwt
if errorlevel 1 goto failed
echo.
echo SUCCESS: Function deployment command completed.
echo Confirm hpt-publish-video is deployed in Supabase Dashboard > Edge Functions.
echo Also confirm HPT_GITHUB_TOKEN exists under Edge Functions > Secrets. The function checks the signed-in admin user itself.
echo.
pause
exit /b 0
:failed
echo.
echo Deployment did not complete. Read the error above and resolve it before retrying.
pause
exit /b 1
