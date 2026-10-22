import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405);

  try {
    const auth = req.headers.get('Authorization') || '';
    const token = auth.replace(/^Bearer\s+/i, '').trim();
    if (!token) return json({ error: 'Admin session is required.' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const githubToken = Deno.env.get('HPT_GITHUB_TOKEN');
    const repo = Deno.env.get('HPT_GITHUB_REPO') || 'bestinraju25/rajudrivingschool';
    const branch = Deno.env.get('HPT_GITHUB_BRANCH') || 'main';
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
    if (!pathValue) return json({ error: 'Video path is required.' }, 400);

    const cleanPath = pathValue.replace(/^\/+/, '').replace(/\.\.(\/|\\)/g, '');
    if (!cleanPath.startsWith('hazard-perception-test/videos/') && !cleanPath.startsWith('videos/')) {
      return json({ error: 'Video path must be inside the HPT videos folder.' }, 400);
    }
    const repoPath = cleanPath.startsWith('hazard-perception-test/') ? cleanPath : `hazard-perception-test/${cleanPath}`;

    const api = `https://api.github.com/repos/${repo}/contents/${repoPath}`;
    const headers = {
      'Authorization': `Bearer ${githubToken}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'Raju-HPT-Admin',
    };

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
    if (file.size > 15 * 1024 * 1024) return json({ error: 'Video is too large for this GitHub upload flow. Keep HPT clips under 15 MB or use object storage/Git LFS.' }, 413);

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
