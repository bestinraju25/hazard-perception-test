// HPT videos are stored in Cloudflare R2. All school, student and exam data stays in Supabase.
window.RAJU_HPT_CONFIG = {
  supabaseUrl: 'https://nceufqdvuuztdfyesbxx.supabase.co',
  supabaseAnonKey: 'sb_publishable_k4nOBK0JngKf6IETQF8ReQ_VXXVhkQQ',
  videoBase: 'https://videos.hazardperceptiontest.co.in/',
  videoPublishFunction: 'hpt-publish-video',
  examClipCount: 10,
  clipLimitSeconds: 50,
  maxResponsesPerClip: 5,
  passMark: 60,
  marksPerClip: 10,
  // Fresh video catalogue: clips are added through Admin and stored in R2.
  staticClips: [],
  staticHazards: {}
};
