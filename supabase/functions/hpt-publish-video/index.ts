import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * HPT video publisher — Cloudflare R2 edition.
 * Deploy under the existing function name: hpt-publish-video.
 *
 * Actions:
 *   presign_upload - return a short-lived signed PUT URL for direct browser uploads.
 *   delete_clip    - delete the clip and its thumbnail from R2.
 *
 * R2 credentials remain server-side in Supabase Edge Function secrets.
 */

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-api-version, x-requested-with',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin',
};

const DEFAULT_BUCKET = 'hpt-videos';
const PUBLIC_BASE_URL = 'https://videos.hazardperceptiontest.co.in';
const PRESIGNED_URL_TTL_SECONDS = 900;
const MAX_VIDEO_BYTES = 512 * 1024 * 1024;
const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing Edge Function secret: ${name}`);
  return value;
}

function optionalEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = Deno.env.get(name)?.trim();
    if (value) return value;
  }
  return undefined;
}

function getConfig() {
  const accountId = requiredEnv('HPT_R2_ACCOUNT_ID');
  const accessKeyId = requiredEnv('HPT_R2_ACCESS_KEY_ID');
  const secretAccessKey = requiredEnv('HPT_R2_SECRET_ACCESS_KEY');
  const bucket = optionalEnv('HPT_R2_BUCKET', 'HPT_R2_BUCKET_NAME') || DEFAULT_BUCKET;
  const publicBaseUrl = (optionalEnv('HPT_R2_PUBLIC_BASE_URL', 'HPT_R2_PUBLIC_URL') || PUBLIC_BASE_URL).replace(/\/+$/, '');
  const endpoint = optionalEnv('HPT_R2_ENDPOINT') || `https://${accountId}.r2.cloudflarestorage.com`;

  if (publicBaseUrl !== PUBLIC_BASE_URL) {
    throw new Error(`HPT_R2_PUBLIC_BASE_URL must be ${PUBLIC_BASE_URL}.`);
  }
  return { accountId, accessKeyId, secretAccessKey, bucket, publicBaseUrl, endpoint };
}

function cleanClipCode(value: unknown): string | null {
  const code = String(value ?? '').trim();
  if (!/^\d{1,4}$/.test(code)) return null;
  return code.padStart(2, '0');
}

function awsEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function encodeObjectKey(key: string): string {
  return key.split('/').map(awsEncode).join('/');
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return bytesToHex(digest);
}

async function hmacSha256(key: ArrayBuffer | Uint8Array, value: string): Promise<Uint8Array> {
  const keyBytes = key instanceof Uint8Array ? key : new Uint8Array(key);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(value));
  return new Uint8Array(signature);
}

async function signingKey(secretAccessKey: string, dateStamp: string): Promise<Uint8Array> {
  const kDate = await hmacSha256(new TextEncoder().encode(`AWS4${secretAccessKey}`), dateStamp);
  const kRegion = await hmacSha256(kDate, 'auto');
  const kService = await hmacSha256(kRegion, 's3');
  return await hmacSha256(kService, 'aws4_request');
}

function utcAmzTimestamp(date: Date): { dateStamp: string; amzDate: string } {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  return { dateStamp: iso.slice(0, 8), amzDate: iso.replace(/Z$/, 'Z') };
}

async function presignR2Url(
  config: ReturnType<typeof getConfig>,
  method: 'PUT' | 'DELETE',
  objectKey: string,
  contentType?: string,
): Promise<string> {
  const endpointUrl = new URL(config.endpoint);
  const canonicalUri = `/${awsEncode(config.bucket)}/${encodeObjectKey(objectKey)}`;
  const now = new Date();
  const { dateStamp, amzDate } = utcAmzTimestamp(now);
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const signedHeaders = method === 'PUT' ? 'content-type;host' : 'host';
  const query: Array<[string, string]> = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', `${config.accessKeyId}/${credentialScope}`],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', String(PRESIGNED_URL_TTL_SECONDS)],
    ['X-Amz-SignedHeaders', signedHeaders],
  ];
  const canonicalQuery = query
    .map(([key, value]) => [awsEncode(key), awsEncode(value)] as [string, string])
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  const canonicalHeaders = method === 'PUT'
    ? `content-type:${String(contentType || '').trim()}\nhost:${endpointUrl.host}\n`
    : `host:${endpointUrl.host}\n`;
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join('\n');

  const key = await signingKey(config.secretAccessKey, dateStamp);
  const signatureBytes = await hmacSha256(key, stringToSign);
  const signature = Array.from(signatureBytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  const finalQuery = `${canonicalQuery}&X-Amz-Signature=${signature}`;
  return `${endpointUrl.origin}${canonicalUri}?${finalQuery}`;
}

function publicObjectUrl(publicBaseUrl: string, objectKey: string): string {
  return `${publicBaseUrl}/${encodeObjectKey(objectKey)}`;
}

function resolveDeleteKey(videoPath: string, clipCode: string, publicBaseUrl: string): string | null {
  try {
    let key = videoPath.trim();
    if (/^https?:\/\//i.test(key)) {
      const parsed = new URL(key);
      if (parsed.origin !== publicBaseUrl) return null;
      key = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
    } else {
      key = decodeURIComponent(key.replace(/^\/+/, ''));
    }
    const escapedCode = clipCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const expected = new RegExp(`^clips/${escapedCode}\\.(mp4|webm|m4v|mov)$`, 'i');
    return expected.test(key) ? key : null;
  } catch {
    return null;
  }
}

async function verifyActiveAdmin(request: Request): Promise<{ userId: string } | { error: string; status: number }> {
  const authorization = request.headers.get('Authorization') || '';
  const accessToken = authorization.replace(/^Bearer\s+/i, '').trim();
  if (!accessToken) return { error: 'Admin session is required. Please sign in again.', status: 401 };

  const supabaseUrl = requiredEnv('SUPABASE_URL');
  const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await adminClient.auth.getUser(accessToken);
  if (userError || !userData.user) return { error: 'Your admin session is invalid or expired. Please sign in again.', status: 401 };

  const { data: admin, error: adminError } = await adminClient
    .from('admin_users')
    .select('id, active')
    .eq('id', userData.user.id)
    .eq('active', true)
    .maybeSingle();

  if (adminError || !admin) return { error: 'This account is not an active HPT administrator.', status: 403 };
  return { userId: userData.user.id };
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (request.method !== 'POST') return jsonResponse({ error: 'POST required' }, 405);

  try {
    const adminCheck = await verifyActiveAdmin(request);
    if ('error' in adminCheck) return jsonResponse({ error: adminCheck.error }, adminCheck.status);

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return jsonResponse({ error: 'A valid JSON request body is required.' }, 400);
    }

    const config = getConfig();
    const action = String(body.action || '').trim().toLowerCase();

    if (action === 'presign_upload') {
      const clipCode = cleanClipCode(body.clip_code);
      const kind = String(body.kind || '').trim().toLowerCase();
      const filename = String(body.filename || '').trim();
      const sizeBytes = Number(body.size_bytes || 0);
      if (!clipCode) return jsonResponse({ error: 'Clip number must contain 1–4 digits.' }, 400);
      if (!filename || filename.length > 180 || /[\\/]/.test(filename)) return jsonResponse({ error: 'A valid filename is required.' }, 400);
      if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 1) return jsonResponse({ error: 'The selected file is empty or has an invalid size.' }, 400);

      let objectKey = '';
      let contentType = '';
      if (kind === 'video') {
        const extensionMatch = filename.match(/\.([a-z0-9]+)$/i);
        const extension = (extensionMatch?.[1] || '').toLowerCase();
        // Use an explicit switch here so the Supabase dashboard editor can
        // parse this section without ambiguity while pasting the function.
        switch (extension) {
          case 'mp4': contentType = 'video/mp4'; break;
          case 'webm': contentType = 'video/webm'; break;
          case 'm4v': contentType = 'video/x-m4v'; break;
          case 'mov': contentType = 'video/quicktime'; break;
          default: contentType = ''; break;
        }
        if (!contentType) return jsonResponse({ error: 'Unsupported video format. Choose MP4, WebM, M4V or MOV.' }, 415);
        if (sizeBytes > MAX_VIDEO_BYTES) return jsonResponse({ error: 'Video exceeds the 512 MB upload limit.' }, 413);
        objectKey = `clips/${clipCode}.${extension}`;
      } else if (kind === 'thumbnail') {
        if (!/\.jpe?g$/i.test(filename)) return jsonResponse({ error: 'Video thumbnail must be a JPEG file.' }, 415);
        if (sizeBytes > MAX_THUMBNAIL_BYTES) return jsonResponse({ error: 'Thumbnail exceeds the 5 MB upload limit.' }, 413);
        contentType = 'image/jpeg';
        objectKey = `thumbnails/${clipCode}.jpg`;
      } else {
        return jsonResponse({ error: 'Upload kind must be video or thumbnail.' }, 400);
      }

      const uploadUrl = await presignR2Url(config, 'PUT', objectKey, contentType);
      return jsonResponse({
        ok: true,
        object_key: objectKey,
        upload_url: uploadUrl,
        public_url: publicObjectUrl(config.publicBaseUrl, objectKey),
        content_type: contentType,
        expires_in: PRESIGNED_URL_TTL_SECONDS,
      });
    }

    if (action === 'delete_clip') {
      const clipCode = cleanClipCode(body.clip_code);
      const videoPath = String(body.video_path || '').trim();
      if (!clipCode || !videoPath) return jsonResponse({ error: 'A valid clip number and video path are required.' }, 400);
      const objectKey = resolveDeleteKey(videoPath, clipCode, config.publicBaseUrl);
      if (!objectKey) return jsonResponse({ error: 'The saved video URL does not match this HPT R2 domain and clip number. No objects were deleted.' }, 400);

      const videoDeleteUrl = await presignR2Url(config, 'DELETE', objectKey);
      const videoDeleteResponse = await fetch(videoDeleteUrl, { method: 'DELETE' });
      if (!videoDeleteResponse.ok) {
        const detail = (await videoDeleteResponse.text()).slice(0, 500);
        return jsonResponse({ error: `R2 video delete failed (${videoDeleteResponse.status}). ${detail}` }, 502);
      }

      const thumbnailDeleteUrl = await presignR2Url(config, 'DELETE', `thumbnails/${clipCode}.jpg`);
      const thumbnailDeleteResponse = await fetch(thumbnailDeleteUrl, { method: 'DELETE' });
      if (!thumbnailDeleteResponse.ok && thumbnailDeleteResponse.status !== 404) {
        const detail = (await thumbnailDeleteResponse.text()).slice(0, 500);
        return jsonResponse({ error: `R2 thumbnail delete failed (${thumbnailDeleteResponse.status}). ${detail}` }, 502);
      }
      return jsonResponse({ ok: true, deleted: true, object_key: objectKey });
    }

    return jsonResponse({ error: 'Unsupported action. Use presign_upload or delete_clip.' }, 400);
  } catch (error) {
    console.error('HPT R2 video function error:', error);
    const message = error instanceof Error ? error.message : 'Unexpected HPT R2 operation error.';
    return jsonResponse({ error: message }, 500);
  }
});
