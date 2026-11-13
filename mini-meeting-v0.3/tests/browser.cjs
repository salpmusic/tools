const { chromium, webkit } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '../..');
const mock = fs.readFileSync(path.join(__dirname, 'mock-sdk.js'), 'utf8');
const sdkPath = process.env.SALP_SDK_PATH;
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, content) => {
    if (error) { res.writeHead(404).end(); return; }
    const ext = path.extname(file);
    res.setHeader('Content-Type', ext === '.html' ? 'text/html; charset=utf-8' : ext === '.css' ? 'text/css' : 'text/javascript');
    res.end(content);
  });
});
async function run(type) {
  const browser = await type.launch({ headless: true, ...(type === chromium ? { channel: 'chromium' } : {}) });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function prepare(options = {}) {
    await page.unrouteAll({ behavior: 'wait' });
    // Remove SRI only for the explicit mock; the real SDK smoke test retains SRI.
    await page.route('**/salp-mini-meeting-v0.3.html*', async route => {
      const html = fs.readFileSync(path.join(root, 'salp-mini-meeting-v0.3.html'), 'utf8').replace(/ integrity="[^"]+"/, '');
      await route.fulfill({ contentType: 'text/html', body: html });
    });
    await page.route('**/livekit-client.umd.js', route => route.fulfill({ contentType: 'text/javascript', body: mock }));
    if (!options.unconfigured) await page.route('**/config.js', route => route.fulfill({ contentType: 'text/javascript', body: "window.SALP_MEETING_CONFIG={tokenEndpoint:'https://token.example/token'}" }));
    await page.route('https://token.example/token', route => route.fulfill({ status: options.tokenStatus || 200, contentType: 'application/json', body: JSON.stringify({ token: 'synthetic-token', url: 'wss://test.livekit.cloud' }) }));
    await page.goto(base + '/salp-mini-meeting-v0.3.html?meeting=family');
    await page.waitForFunction(() => document.getElementById('status').textContent !== '準備しています…');
  }
  async function join(mode = 'low') {
    await page.locator('#name').fill('さくら'); await page.locator('#code').fill('synthetic-code-012345');
    await page.locator('#mode').selectOption(mode); await page.locator('#join').click();
  }
  await prepare({ unconfigured: true });
  assert.equal(await page.locator('#join').isDisabled(), true);
  assert.match(await page.locator('#status').textContent(), /接続設定待ち/);
  await prepare({ tokenStatus: 401 }); await join();
  await page.waitForFunction(() => document.getElementById('status').textContent.includes('有効期限'));
  assert.equal(await page.locator('#join').isEnabled(), true);
  await prepare(); await join();
  await page.locator('#room-panel').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#stage-name').textContent(), '太郎');
  await page.evaluate(() => {
    const p = testRoom.remoteParticipants.get('remote1');
    p.camera.track = makeTestTrack('video', 'camera1');
    testRoom.emit('TrackSubscribed', p.camera.track);
    window.testAudioTrack = makeTestTrack('audio', 'audio1');
    testRoom.emit('TrackSubscribed', testAudioTrack);
    testRoom.emit('TrackSubscribed', testAudioTrack);
  });
  assert.equal(await page.locator('#stage video').count(), 1);
  assert.equal(await page.locator('#stage video').evaluate(el => el.muted && el.playsInline), true);
  assert.equal(await page.locator('#remote-audio audio').count(), 1);
  await page.evaluate(() => testRoom.emit('TrackUnsubscribed', testAudioTrack));
  assert.equal(await page.locator('#remote-audio audio').count(), 0);
  assert.equal(await page.evaluate(() => testRoom.connectOptions.autoSubscribe), false);
  assert.equal(await page.evaluate(() => testRoom.options.videoCaptureDefaults.resolution.width), 320);
  assert.equal(await page.evaluate(() => testRoom.localParticipant.isMicrophoneEnabled), true);
  assert.equal(await page.locator('#code').inputValue(), '');
  await page.locator('#mic').click();
  assert.equal(await page.evaluate(() => testRoom.localParticipant.isMicrophoneEnabled), false);
  await page.locator('#camera').click();
  assert.equal(await page.evaluate(() => testRoom.localParticipant.isCameraEnabled), true);
  await page.evaluate(() => { const p = testRoom.remoteParticipants.get('remote2'); p.isSpeaking = true; testRoom.emit('ActiveSpeakersChanged', [p]); });
  assert.equal(await page.locator('#stage-name').textContent(), '花子');
  assert.equal(await page.locator('#stage video').count(), 0);
  assert.equal(await page.evaluate(() => testRoom.remoteParticipants.get('remote1').camera.subscribed), false);
  assert.equal(await page.evaluate(() => testRoom.remoteParticipants.get('remote2').camera.subscribed), true);
  await page.locator('.person').filter({ hasText: '太郎' }).click();
  assert.match(await page.locator('#stage-name').textContent(), /太郎.*固定中/);
  await page.locator('#auto').click();
  assert.equal(await page.locator('#stage-name').textContent(), '花子');
  await page.locator('#audio').click();
  assert.equal(await page.locator('#camera').isDisabled(), true);
  assert.equal(await page.evaluate(() => testRoom.localParticipant.isCameraEnabled), false);
  assert.equal(await page.evaluate(() => Array.from(testRoom.remoteParticipants.values()).some(p => p.camera.subscribed)), false);
  await page.locator('#audio').click();
  assert.equal(await page.locator('#camera').isEnabled(), true);
  await page.evaluate(() => testRoom.emit('Reconnecting'));
  assert.match(await page.locator('#status').textContent(), /再接続/);
  await page.evaluate(() => testRoom.emit('Reconnected'));
  await page.locator('#leave').click();
  assert.equal(await page.evaluate(() => testRoom.disconnected), true);
  assert.equal(await page.locator('#join-form').isVisible(), true);
  assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);
  await prepare(); await page.evaluate(() => { window.denyMic = true; window.blockAudio = true; }); await join('audio');
  await page.locator('#room-panel').waitFor({ state: 'visible' });
  assert.match(await page.locator('#status').textContent(), /聞くだけ/);
  assert.equal(await page.locator('#play-audio').isVisible(), true);
  await page.evaluate(() => { window.blockAudio = false; }); await page.locator('#play-audio').click();
  assert.equal(await page.locator('#play-audio').isHidden(), true);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.locator('#leave').click();
  await prepare(); await page.evaluate(() => { window.failConnect = true; }); await join();
  await page.waitForFunction(() => document.getElementById('status').textContent.includes('接続できませんでした'));
  assert.equal(await page.evaluate(() => testRoom.disconnected), true);
  if (sdkPath) {
    await page.unrouteAll({ behavior: 'wait' });
    await page.route('**/livekit-client.umd.js', route => route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(sdkPath) }));
    await page.goto(base + '/salp-mini-meeting-v0.3.html');
    await page.waitForFunction(() => window.LivekitClient && document.getElementById('status').textContent !== '準備しています…');
    assert.equal(await page.evaluate(() => LivekitClient.isBrowserSupported()), true);
    assert.equal(await page.locator('#join').isDisabled(), true);
  }
  assert.deepEqual(errors, []);
  await browser.close();
  console.log(type.name() + ': UI checks passed' + (sdkPath ? '; actual SDK + SRI smoke passed' : ''));
}
server.listen(0, '127.0.0.1', async () => {
  try { await run(chromium); await run(webkit); }
  catch (error) { console.error(error); process.exitCode = 1; }
  finally { server.close(); }
});
