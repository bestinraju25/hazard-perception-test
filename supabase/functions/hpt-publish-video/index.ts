import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-api-version, x-requested-with',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405);

  try {
    const auth = req.headers.get('Authorization') || '';
    const token = auth.replace(/^Bearer\s+/i, '').trim();
    if (!token) return json({ error: 'Admin session is required.' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const githubToken = Deno.env.get('HPT_GITHUB_TOKEN');
    const repo = Deno.env.get('HPT_GITHUB_REPO') || 'bestinraju25/hazard-perception-test';
    const branch = Deno.env.get('HPT_GITHUB_BRANCH') || 'main';
    if (!supabaseUrl || !serviceKey) return json({ error: 'Supabase server credentials are missing from the Edge Function environment.' }, 500);
    if (!githubToken) return json({ error: 'HPT_GITHUB_TOKEN is not configured in Supabase Edge Function secrets.' }, 500);

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: userData, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !userData.user) return json({ error: 'Your admin session is invalid or expired. Please sign in again.' }, 401);

    const { data: admin, error: adminError } = await adminClient
      .from('admin_users').select('id,active').eq('id', userData.user.id).eq('active', true).maybeSingle();
    if (adminError || !admin) return json({ error: 'This account is not an active Raju Driving School admin.' }, 403);

    const form = await req.formData();
    const action = String(form.get('action') || 'publish').trim().toLowerCase();
    const pathValue = String(form.get('path') || '').trim();
    const message = String(form.get('commit_message') || `HPT: ${action} video`).trim();

    const headers = {
      'Authorization': `Bearer ${githubToken}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'Raju-HPT-Admin',
    };

    // Discover every numbered video in the repository. The admin library uses this
    // list in addition to hpt_videos so GitHub clips without hazard metadata are
    // visible and can be configured instead of silently disappearing.
    if (action === 'list_videos') {
      // Contents API returns at most 100 entries per page. Paginate so the
      // manager library does not stop at the first page as the clip catalogue grows.
      const entries: any[] = [];
      for (let page = 1; page <= 10; page++) {
        const listingUrl = `https://api.github.com/repos/${repo}/contents/videos?ref=${encodeURIComponent(branch)}&per_page=100&page=${page}`;
        const listing = await fetch(listingUrl, { headers });
        if (!listing.ok) {
          const err = await listing.text();
          return json({ error: `GitHub video library lookup failed (${listing.status}, page ${page}). ${err.slice(0, 600)}` }, 502);
        }
        const batch = await listing.json();
        if (!Array.isArray(batch)) return json({ error: 'GitHub did not return a videos directory listing.' }, 502);
        entries.push(...batch);
        if (batch.length < 100) break;
      }
      const videos = entries
        .filter((item: any) => item?.type === 'file' && /^\d+\.(webm|mp4|m4v|mov)$/i.test(String(item.name || '')))
        .map((item: any) => ({ name: item.name, path: item.path, size: Number(item.size || 0), sha: item.sha || null, download_url: item.download_url || null }))
        .sort((a: any, b: any) => Number(a.name.replace(/\D/g, '')) - Number(b.name.replace(/\D/g, '')));
      return json({ ok: true, repo, branch, count: videos.length, videos });
    }

    if (!pathValue) return json({ error: 'Video path is required.' }, 400);

    // The live Pages site is bestinraju25.github.io/hazard-perception-test,
    // whose repository root contains videos/ and thumbnails/. Accept only a single
    // safe filename in either directory; never let the client write elsewhere.
    const rawPath = pathValue.replace(/\\/g, '/').replace(/^\/+/, '');
    if (rawPath.split('/').some(part => part === '..' || part === '.')) {
      return json({ error: 'Invalid video path.' }, 400);
    }
    const cleanPath = rawPath.replace(/^hazard-perception-test\//, ''); // accept legacy client paths, map to repo root
    const allowedVideo = /^videos\/[A-Za-z0-9._-]+\.(webm|mp4|m4v|mov)$/i.test(cleanPath);
    const allowedThumbnail = /^thumbnails\/[A-Za-z0-9._-]+\.(jpg|jpeg|png|webp)$/i.test(cleanPath);
    if (!allowedVideo && !allowedThumbnail) {
      return json({ error: 'Path must be a video inside videos/ or a thumbnail inside thumbnails/.' }, 400);
    }
    const repoPath = cleanPath;
    const api = `https://api.github.com/repos/${repo}/contents/${repoPath}`;
    if (action === 'delete') {
      const existing = await fetch(`${api}?ref=${encodeURIComponent(branch)}`, { headers });
      if (existing.status === 404) {
        return json({ ok: true, deleted: false, missing: true, path: repoPath });
      }
      if (!existing.ok) {
        const err = await existing.text();
        return json({ error: `GitHub lookup failed (${existing.status}). ${err.slice(0, 400)}` }, 502);
      }
      const current = await existing.json();
      if (!current?.sha) return json({ error: 'GitHub did not return the video file SHA needed for deletion.' }, 502);
      const del = await fetch(api, {
        method: 'DELETE', headers,
        body: JSON.stringify({ message, sha: current.sha, branch }),
      });
      if (!del.ok) {
        const err = await del.text();
        return json({ error: `GitHub delete failed (${del.status}). ${err.slice(0, 600)}` }, 502);
      }
      const result = await del.json();
      return json({ ok: true, deleted: true, missing: false, path: repoPath, commit: result.commit?.sha || null });
    }

    const file = form.get('file');
    if (!(file instanceof File)) return json({ error: 'No video file was received.' }, 400);
    const maxBytes = allowedThumbnail ? 5 * 1024 * 1024 : 15 * 1024 * 1024;
    if (file.size > maxBytes) return json({ error: `${allowedThumbnail ? 'Thumbnail' : 'Video'} is too large for this GitHub upload flow. Maximum size: ${allowedThumbnail ? '5 MB' : '15 MB'}.` }, 413);

    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    const content = btoa(binary);

    let sha: string | undefined;
    const existing = await fetch(`${api}?ref=${encodeURIComponent(branch)}`, { headers });
    if (existing.ok) {
      const current = await existing.json();
      sha = current.sha;
    } else if (existing.status !== 404) {
      const err = await existing.text();
      return json({ error: `GitHub lookup failed (${existing.status}). ${err.slice(0, 400)}` }, 502);
    }

    const put = await fetch(api, {
      method: 'PUT', headers,
      body: JSON.stringify({ message, content, branch, ...(sha ? { sha } : {}) }),
    });
    if (!put.ok) {
      const err = await put.text();
      return json({ error: `GitHub upload failed (${put.status}). ${err.slice(0, 600)}` }, 502);
    }
    const result = await put.json();
    return json({ ok: true, path: repoPath, sha: result.content?.sha || null, commit: result.commit?.sha || null });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Unexpected HPT GitHub operation error.' }, 500);
  }
});
