DRIVE YOURSELF — V89 INTEGRATED GAME

This release adds the separate Drive Yourself 3D practice game to the existing HPT website.

HOW STUDENTS OPEN IT
- Sign in normally with the driving school's existing access code.
- A PLAY GAME button appears in the school portal header.
- Click it and enter the separate game code: 1001.
- The game uses the current school session and verifies that school again through the existing Supabase school-access RPC.

GAMEPLAY
- Exactly 10 hazards are selected for each practice session from the built-in 50-scenario hazard library.
- Laptop/desktop: hold the UP ARROW to move forward. Release it to slow down. Press SPACE when a developing hazard is recognised.
- Mobile/tablet: hold HOLD TO DRIVE to move forward. Release to slow down. Tap BRAKE when a developing hazard is recognised.
- The brake action is only a hazard-response marker. It does not apply vehicle braking, stop the car, or pause the route.
- The road has automatic bends. There are no side-steering controls.
- Press C or tap the camera button to switch between chase and driver-seat views.
- Each hazard is worth up to 10 points; a session is out of 100.

WHAT IS RENDERED
The game uses original procedural Three.js geometry and generated surface textures: a compact learner car with body panels, windows, door seams, headlights, tail lamps, mirrors, cabin, wheels and alloy details; road bends and markings; Kerala-inspired buildings, tiled roofs, palms and roadside props; traffic, pedestrians, animals and hazard objects; sky, lighting, fog, rain and shadows. No official HPT video clips are loaded into the game.

INSTALLATION
1. Back up the currently deployed website repository.
2. Extract this complete project ZIP.
3. Upload/replace the website project files with the extracted V89 files, preserving any repository-only files or large video assets that were not part of the ZIP you supplied.
4. Commit and push to the existing GitHub Pages branch.
5. Open the site, sign in with a school code, and test PLAY GAME → 1001.
6. Hard-refresh the browser (Ctrl+F5) if the old portal header or game files remain cached.

No Supabase schema change, SQL migration, Edge Function deployment, or official HPT video re-upload is required for this game integration.

IMPORTANT
- The game score is practice-only and is not inserted into official exam attempts, responses, reports, certificates or leaderboards.
- Student name and mobile number are used only in the current in-memory game session; they are not submitted to the HPT database.
- The 1001 game code is a client-side demo gate, not a secure commercial license. Anyone with access to the website's JavaScript can inspect it. Use a server-side validation RPC before commercial access control.
- Real-time 3D requires WebGL and hardware acceleration. There is deliberately no cartoon 2D substitute if WebGL is unavailable.
- This is a real-time 3D prototype, not yet a photoreal AAA simulator. All game scene and vehicle assets in this patch are original procedural geometry/materials; the Hey Auto project is used only as a broad experience reference, not copied source or artwork.

REPOSITORY VIDEO FOLDER SAFETY
The V88 ZIP supplied for this update did not contain the repository's large /videos/ folder. The official live HPT website has separate video assets in that folder. When deploying the full ZIP over the existing GitHub repository, preserve the current /videos/ folder and any repository-only video assets. The game itself never reads from that folder.
