import test from 'node:test';
import assert from 'node:assert/strict';
import { TokenVerifier } from '../server/node_modules/livekit-server-sdk/dist/index.js';
import { createHandler, sha256 } from '../server/worker.js';

// Synthetic test credentials only; these have no access to any LiveKit project.
const testCode = 'synthetic-test-code-012345';
const testKey = 'synthetic-test-key';
const testSecret = 'synthetic-test-secret-that-is-not-a-real-credential';
const origin = 'https://salpmusic.github.io';
const baseTime = Date.now();
const env = {
  ALLOWED_ORIGIN: origin, LIVEKIT_URL: 'wss://test-project.livekit.cloud',
  LIVEKIT_API_KEY: testKey, LIVEKIT_API_SECRET: testSecret,
  TOKEN_RATE_LIMITER: { limit: async () => ({ success: true }) },
  MEETINGS_JSON: JSON.stringify({ family: { codeSha256: await sha256(testCode), expiresAt: new Date(baseTime + 3600000).toISOString() } })
};
let roomOptions;
const handler = createHandler({ now: () => baseTime, makeRoomService: () => ({ createRoom: async options => { roomOptions = options; } }) });
function request(body = { name: 'さくら', meeting: 'family', code: testCode }, headers = {}, method = 'POST') {
  return new Request('https://token.example/token', {
    method, headers: { Origin: origin, 'Content-Type': 'application/json', ...headers },
    ...(method === 'POST' ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {})
  });
}
test('signed token: unique identity, room-scoped grants, TTL <= 5 minutes, max 10', async () => {
  const response = await handler(request(), env);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store, private');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
  const body = await response.json();
  const claims = await new TokenVerifier(testKey, testSecret).verify(body.token);
  assert.equal(claims.name, 'さくら');
  assert.equal(claims.video.room, 'salp-v03-family');
  assert.equal(claims.video.roomJoin, true);
  assert.equal(claims.video.canPublishData, false);
  assert.deepEqual(claims.video.canPublishSources, ['microphone', 'camera']);
  assert.ok(claims.exp - Math.floor(Date.now() / 1000) <= 300);
  assert.ok(claims.exp > Math.floor(Date.now() / 1000));
  assert.equal(claims.video.roomAdmin, undefined);
  assert.equal(claims.video.roomCreate, undefined);
  assert.equal(roomOptions.maxParticipants, 10);
  const second = await (await handler(request(), env)).json();
  assert.notEqual((await new TokenVerifier(testKey, testSecret).verify(second.token)).sub, claims.sub);
});
test('token TTL is bounded by meeting expiry', async () => {
  const short = { ...env, MEETINGS_JSON: JSON.stringify({ family: { codeSha256: await sha256(testCode), expiresAt: new Date(baseTime + 45000).toISOString() } }) };
  const { token } = await (await handler(request(), short)).json();
  const claims = await new TokenVerifier(testKey, testSecret).verify(token);
  assert.ok(claims.exp - Math.floor(Date.now() / 1000) <= 45);
});
test('reject unknown meeting, wrong code and expired meeting equally', async () => {
  for (const body of [{ name: '花', meeting: 'unknown', code: testCode }, { name: '花', meeting: 'family', code: 'wrong-code-long-enough' }]) {
    const response = await handler(request(body), env);
    assert.equal(response.status, 401); assert.deepEqual(await response.json(), { error: 'invalid_meeting' });
  }
  const expired = { ...env, MEETINGS_JSON: JSON.stringify({ family: { codeSha256: await sha256(testCode), expiresAt: '2000-01-01T00:00:00Z' } }) };
  assert.equal((await handler(request(), expired)).status, 401);
});
test('deny wrong and missing Origin without reflecting it', async () => {
  for (const value of ['https://evil.example', 'null', '']) {
    const response = await handler(request(undefined, { Origin: value }), env);
    assert.equal(response.status, 403); assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  }
});
test('CORS preflight and method/path restrictions', async () => {
  const response = await handler(request(undefined, {}, 'OPTIONS'), env);
  assert.equal(response.status, 204); assert.equal(response.headers.get('Access-Control-Allow-Methods'), 'POST');
  assert.equal((await handler(request(undefined, {}, 'GET'), env)).status, 405);
  assert.equal((await handler(new Request('https://token.example/token?code=foo', { headers: { Origin: origin } }), env)).status, 404);
});
test('input limits, malformed JSON, controls, invalid IDs, no prototype lookup', async () => {
  for (const body of ['{', null, { name: ' ', meeting: 'family', code: testCode }, { name: 'a'.repeat(41), meeting: 'family', code: testCode }, { name: 'a\n', meeting: 'family', code: testCode }, { name: '花', meeting: '../foo', code: testCode }, { name: '花', meeting: 'family', code: 'short' }]) {
    assert.equal((await handler(request(body), env)).status, 400);
  }
  assert.equal((await handler(request({ name: '花', meeting: '__proto__', code: testCode }), env)).status, 401);
  assert.equal((await handler(request('{}', { 'Content-Type': 'text/plain' }), env)).status, 415);
  assert.equal((await handler(request('x'.repeat(3000)), env)).status, 400);
  assert.equal((await handler(request('{}', { 'Content-Length': '3000' }), env)).status, 413);
});
test('rate limit, unavailable configuration and upstream failure fail closed', async () => {
  const limited = await handler(request(), { ...env, TOKEN_RATE_LIMITER: { limit: async () => ({ success: false }) } });
  assert.equal(limited.status, 429); assert.equal(limited.headers.get('Retry-After'), '60');
  for (const key of ['LIVEKIT_API_SECRET', 'MEETINGS_JSON', 'TOKEN_RATE_LIMITER', 'LIVEKIT_URL']) assert.equal((await handler(request(), { ...env, [key]: '' })).status, 503);
  const failing = createHandler({ makeRoomService: () => ({ createRoom: async () => { throw new Error(testSecret); } }) });
  const response = await failing(request(), env);
  assert.equal(response.status, 503); assert.ok(!(await response.text()).includes(testSecret));
});
