// The code is printed locally once. Do not save output in the repository or chat.
import { randomBytes, createHash } from 'node:crypto';
const [meeting, expiresAt] = process.argv.slice(2);
if (!/^[A-Za-z0-9_-]{1,48}$/.test(meeting || '') || !(Date.parse(expiresAt) > Date.now())) {
  console.error('使い方: node create-meeting.mjs family-01 2026-12-01T12:00:00Z（未来の有効期限）');
  process.exit(1);
}
const code = randomBytes(18).toString('base64url');
console.log('参加者へ個別に知らせる参加コード（GitHubには保存しない）: ' + code);
console.log('MEETINGS_JSON に登録する JSON:');
console.log(JSON.stringify({ [meeting]: { codeSha256: createHash('sha256').update(code).digest('hex'), expiresAt } }));
