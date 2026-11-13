import { AccessToken, RoomServiceClient, TrackSource } from 'livekit-server-sdk';

const MAX_BODY = 2048;
const ROOM_LIMIT = 10;
const allowedMeeting = /^[A-Za-z0-9_-]{1,48}$/;

export async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
}
function equalHash(left, right) {
  if (!/^[a-f0-9]{64}$/.test(right || '')) return false;
  let difference = 0;
  for (let i = 0; i < 64; i++) difference |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return difference === 0;
}
async function readBoundedJSON(request) {
  if (!request.body) throw new Error('empty');
  const reader = request.body.getReader();
  let total = 0;
  const chunks = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY) { await reader.cancel(); throw new Error('large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const combined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { combined.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(combined));
}
export function createHandler(dependencies = {}) {
  const makeRoomService = dependencies.makeRoomService || ((url, key, secret) => new RoomServiceClient(url, key, secret));
  const now = dependencies.now || (() => Date.now());
  return async function fetch(request, env) {
    const origin = request.headers.get('Origin');
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, private',
      'Pragma': 'no-cache',
      'Vary': 'Origin',
      'X-Content-Type-Options': 'nosniff'
    };
    const reply = (status, error) => new Response(error ? JSON.stringify({ error }) : null, { status, headers });
    // CORS limits browser origins; meeting codes provide the actual admission check.
    if (!env.ALLOWED_ORIGIN || origin !== env.ALLOWED_ORIGIN) return reply(403, 'origin_denied');
    headers['Access-Control-Allow-Origin'] = env.ALLOWED_ORIGIN;
    const url = new URL(request.url);
    if (url.pathname !== '/token' || url.search) return reply(404, 'not_found');
    if (request.method === 'OPTIONS') {
      headers['Access-Control-Allow-Methods'] = 'POST';
      headers['Access-Control-Allow-Headers'] = 'Content-Type';
      headers['Access-Control-Max-Age'] = '600';
      return reply(204);
    }
    if (request.method !== 'POST') return reply(405, 'method_not_allowed');
    if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) return reply(415, 'json_required');
    if (Number(request.headers.get('Content-Length')) > MAX_BODY) return reply(413, 'body_too_large');
    if (!env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET || !env.MEETINGS_JSON || !env.TOKEN_RATE_LIMITER || !/^wss:\/\/[a-z0-9-]+\.livekit\.cloud\/?$/i.test(env.LIVEKIT_URL || '')) return reply(503, 'not_configured');
    try {
      const { success } = await env.TOKEN_RATE_LIMITER.limit({ key: request.headers.get('CF-Connecting-IP') || 'unknown' });
      if (!success) { headers['Retry-After'] = '60'; return reply(429, 'rate_limited'); }
      let body;
      try { body = await readBoundedJSON(request); } catch (_) { return reply(400, 'invalid_body'); }
      if (!body || typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 40 || /[\u0000-\u001f\u007f]/.test(body.name) || typeof body.meeting !== 'string' || !allowedMeeting.test(body.meeting) || typeof body.code !== 'string' || body.code.length < 16 || body.code.length > 128) return reply(400, 'invalid_input');
      const meetings = JSON.parse(env.MEETINGS_JSON);
      const meeting = Object.hasOwn(meetings, body.meeting) ? meetings[body.meeting] : null;
      const suppliedHash = await sha256(body.code);
      // Same failure for unknown, expired, or wrong-code meetings.
      if (!meeting || !equalHash(suppliedHash, meeting.codeSha256) || !Number.isFinite(Date.parse(meeting.expiresAt)) || Date.parse(meeting.expiresAt) <= now()) return reply(401, 'invalid_meeting');
      const roomName = 'salp-v03-' + body.meeting;
      const service = makeRoomService(env.LIVEKIT_URL.replace(/^wss:/, 'https:'), env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);
      // The SFU enforces the participant limit, including concurrent join attempts.
      await service.createRoom({ name: roomName, maxParticipants: ROOM_LIMIT, emptyTimeout: 300, departureTimeout: 60 });
      const secondsRemaining = Math.floor((Date.parse(meeting.expiresAt) - now()) / 1000);
      if (secondsRemaining < 1) return reply(401, 'invalid_meeting');
      const token = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
        identity: crypto.randomUUID(), name: body.name.trim(), ttl: Math.min(300, secondsRemaining)
      });
      token.addGrant({
        roomJoin: true, room: roomName, canPublish: true, canSubscribe: true,
        canPublishData: false, canPublishSources: [TrackSource.MICROPHONE, TrackSource.CAMERA]
      });
      return new Response(JSON.stringify({ url: env.LIVEKIT_URL, token: await token.toJwt() }), { status: 200, headers });
    } catch (_) {
      // Never log request bodies, credentials, codes, or JWTs.
      return reply(503, 'service_unavailable');
    }
  };
}

export default { fetch: createHandler() };
