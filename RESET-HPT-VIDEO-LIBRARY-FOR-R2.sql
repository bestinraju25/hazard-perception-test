-- OPTIONAL FRESH START: clear legacy HPT video definitions before adding new R2 clips.
-- BACK UP public.hpt_videos and public.hpt_hazards first.
-- This removes only the video catalogue and hazard definitions.
-- It preserves schools, students, hpt_attempts, hpt_responses, scores and leaderboard records.
-- Existing response rows retain clip_code and awarded_marks; video_id becomes NULL because
-- hpt_responses.video_id references hpt_videos with ON DELETE SET NULL.
-- Historical report regeneration will no longer have the old video/hazard definitions.
-- Do not run this if you need those old definitions for previous reports.

begin;
delete from public.hpt_hazards;
delete from public.hpt_videos;
commit;
