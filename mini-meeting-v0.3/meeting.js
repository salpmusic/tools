/* global LivekitClient */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var room = null, busy = false, pinned = null, speaker = null, stageTrack = null;
  var audioOnly = false, mode = 'low', generation = 0;
  var attachedAudio = new Map();
  var LK = window.LivekitClient;
  var endpoint = (window.SALP_MEETING_CONFIG || {}).tokenEndpoint;
  function status(message, error) {
    $('status').textContent = message;
    $('status').className = 'notice' + (error ? ' error' : '');
  }
  function ready() {
    return LK && window.isSecureContext && navigator.mediaDevices && window.RTCPeerConnection && LK.isBrowserSupported();
  }
  function participants() {
    return room ? [room.localParticipant].concat(Array.from(room.remoteParticipants.values())) : [];
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
  function selectedParticipant() {
    var all = participants();
    return all.find(function (p) { return p.identity === (pinned || speaker); }) || all.find(function (p) { return p !== room.localParticipant; }) || room.localParticipant;
  }
  function cameraPublication(p) { return p.getTrackPublication(LK.Track.Source.Camera); }
  function detachStage() {
    if (stageTrack) { stageTrack.detach().forEach(function (el) { el.remove(); }); stageTrack = null; }
    clear($('stage'));
  }
  function attachAudio(track) {
    if (attachedAudio.has(track.sid)) return;
    var el = track.attach();
    el.autoplay = true;
    $('remote-audio').appendChild(el);
    attachedAudio.set(track.sid, { track: track, element: el });
  }
  function removeAudio(track) {
    var entry = attachedAudio.get(track.sid);
    if (entry) { track.detach(entry.element); entry.element.remove(); attachedAudio.delete(track.sid); }
  }
  function syncSubscriptions() {
    if (!room) return;
    var selected = selectedParticipant();
    room.remoteParticipants.forEach(function (p) {
      p.videoTrackPublications.forEach(function (pub) {
        var desired = !audioOnly && p === selected;
        if (pub.isDesired !== desired) pub.setSubscribed(desired);
        if (desired) pub.setVideoQuality(mode === 'normal' ? LK.VideoQuality.HIGH : LK.VideoQuality.LOW);
      });
    });
  }
  function render() {
    if (!room) return;
    var all = participants(), local = room.localParticipant;
    var selected = selectedParticipant();
    syncSubscriptions();
    var pub = cameraPublication(selected);
    var track = !audioOnly && pub && !pub.isMuted ? pub.track : null;
    if (stageTrack !== track || !track) {
      detachStage();
      if (track) {
        stageTrack = track;
        var video = track.attach();
        video.autoplay = true; video.playsInline = true; video.muted = true;
        $('stage').appendChild(video);
      } else {
        var placeholder = document.createElement('p');
        placeholder.textContent = audioOnly ? '音声優先で通話中です' : selected.name + ' さんのカメラは切れています';
        $('stage').appendChild(placeholder);
      }
    }
    $('stage-name').textContent = (selected.name || '参加者') + (selected === local ? '（あなた）' : '') + (pinned ? ' · 固定中' : '');
    $('count').textContent = all.length + '人 / 最大10人';
    var existing = new Map();
    Array.from($('people').children).forEach(function (el) { existing.set(el.dataset.identity, el); });
    all.forEach(function (p) {
      var b = existing.get(p.identity) || document.createElement('button');
      existing.delete(p.identity);
      b.dataset.identity = p.identity;
      b.type = 'button'; b.className = 'person' + (p.isSpeaking ? ' active' : '');
      b.setAttribute('aria-pressed', String(p.identity === pinned));
      var name = b.querySelector('span') || document.createElement('span');
      name.textContent = (p.name || '参加者') + (p === local ? '（あなた）' : '');
      var info = b.querySelector('small') || document.createElement('small');
      info.textContent = (p.isMicrophoneEnabled ? 'マイク：入' : 'マイク：切') + (p.isSpeaking ? ' · 発話中' : '');
      if (!name.parentNode) { b.appendChild(name); b.appendChild(info); }
      b.onclick = function () { pinned = p.identity; render(); };
      if (!b.parentNode) $('people').appendChild(b);
    });
    existing.forEach(function (el) { el.remove(); });
    $('auto').hidden = !pinned;
    $('mic').textContent = 'マイク：' + (local.isMicrophoneEnabled ? '入（押すと切）' : '切（押すと入）');
    $('mic').setAttribute('aria-pressed', String(local.isMicrophoneEnabled));
    $('camera').textContent = 'カメラ：' + (local.isCameraEnabled ? '入（押すと切）' : '切（押すと入）');
    $('camera').setAttribute('aria-pressed', String(local.isCameraEnabled));
    $('camera').disabled = busy || audioOnly;
    $('audio').textContent = audioOnly ? '映像も使う' : '音声優先にする';
    $('audio').setAttribute('aria-pressed', String(audioOnly));
  }
  function reset(message) {
    generation++;
    room = null; pinned = null; speaker = null;
    detachStage();
    attachedAudio.forEach(function (entry) { entry.track.detach(entry.element); entry.element.remove(); });
    attachedAudio.clear();
    clear($('people')); $('room-panel').hidden = true;
    $('join-form').hidden = false; $('play-audio').hidden = true;
    $('code').value = ''; busy = false; $('join').disabled = !ready() || !endpoint;
    if (message) status(message);
  }
  function errorMessage(e) {
    if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') return 'マイク・カメラの使用を許可してください。端末の設定から許可して、もう一度お試しください。';
    if (e.name === 'NotFoundError') return 'マイクまたはカメラが見つかりません。接続を確認してください。';
    return e.publicMessage || '接続できませんでした。ネット接続と会議番号・参加コードを確認して、もう一度お試しください。';
  }
  async function join(event) {
    event.preventDefault();
    if (busy || room) return;
    var name = $('name').value.trim(), meeting = $('meeting').value.trim(), code = $('code').value;
    if (!name || !/^[a-zA-Z0-9_-]{1,48}$/.test(meeting) || !code) { status('お名前・会議番号・参加コードを入力してください。', true); return; }
    busy = true; $('join').disabled = true;
    mode = $('mode').value; audioOnly = mode === 'audio';
    status('会議に接続しています…');
    var ownGeneration = ++generation, candidate = null;
    var abort = new AbortController(), timeout = setTimeout(function () { abort.abort(); }, 15000);
    try {
      var response = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', signal: abort.signal,
        body: JSON.stringify({ name: name, meeting: meeting, code: code })
      });
      clearTimeout(timeout);
      if (!response.ok) {
        var error = new Error('Token request failed');
        error.publicMessage = response.status === 401 ? '会議番号・参加コード、または会議の有効期限を確認してください。' : response.status === 429 ? '操作が続いたため少し待ってから入室してください。' : '会議サーバーに接続できません。主催者に設定を確認してください。';
        throw error;
      }
      var connection = await response.json();
      if (!connection.token || typeof connection.url !== 'string' || !/^wss:\/\//.test(connection.url)) throw new Error('Invalid server response');
      if (generation !== ownGeneration) return;
      candidate = new LK.Room({
        adaptiveStream: mode === 'normal' && LK.supportsAdaptiveStream(), dynacast: LK.supportsDynacast(),
        videoCaptureDefaults: { resolution: mode === 'normal' ? { width: 640, height: 360, frameRate: 20 } : { width: 320, height: 240, frameRate: 10 }, facingMode: 'user' },
        audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        publishDefaults: { videoCodec: 'h264', simulcast: mode === 'normal', videoEncoding: { maxBitrate: mode === 'normal' ? 450000 : 150000, maxFramerate: mode === 'normal' ? 20 : 10 } }
      });
      room = candidate;
      var E = LK.RoomEvent;
      function current() { return room === candidate && generation === ownGeneration; }
      candidate.on(E.TrackSubscribed, function (track) { if (!current()) return; if (track.kind === LK.Track.Kind.Audio) attachAudio(track); render(); });
      candidate.on(E.TrackUnsubscribed, function (track) { if (!current()) return; removeAudio(track); render(); });
      [E.ParticipantConnected, E.TrackPublished].forEach(function (ev) { candidate.on(ev, function () { if (current()) { syncSubscriptions(); render(); } }); });
      candidate.on(E.ParticipantDisconnected, function (p) { if (!current()) return; if (pinned === p.identity) pinned = null; p.audioTrackPublications.forEach(function (pub) { if (pub.track) removeAudio(pub.track); }); render(); });
      [E.TrackMuted, E.TrackUnmuted, E.LocalTrackPublished, E.LocalTrackUnpublished, E.TrackUnpublished].forEach(function (ev) { candidate.on(ev, function () { if (current()) render(); }); });
      candidate.on(E.ActiveSpeakersChanged, function (speakers) {
        if (!current()) return;
        if (speakers.length) speaker = speakers[0].identity;
        render();
      });
      candidate.on(E.Reconnecting, function () { if (current()) status('接続が途切れました。再接続しています…'); });
      candidate.on(E.Reconnected, function () { if (current()) { syncSubscriptions(); render(); status('再接続しました。お話しできます。'); } });
      candidate.on(E.Disconnected, function () { if (current()) reset('会議との接続が終了しました。もう一度入室できます。'); });
      candidate.on(E.AudioPlaybackStatusChanged, function () { if (current()) $('play-audio').hidden = candidate.canPlaybackAudio; });
      candidate.on(E.MediaDevicesError, function () { if (current()) status('マイク・カメラを確認してください。ボタンからもう一度入れられます。', true); });
      // autoSubscribe=false prevents video reception before audio-only settings are applied.
      await candidate.connect(connection.url, connection.token, { autoSubscribe: false });
      connection = null; $('code').value = '';
      if (!current()) { await candidate.disconnect(); return; }
      candidate.remoteParticipants.forEach(function (p) { p.audioTrackPublications.forEach(function (pub) { pub.setSubscribed(true); }); });
      candidate.on(E.TrackPublished, function (pub) { if (current() && pub.kind === LK.Track.Kind.Audio) pub.setSubscribed(true); });
      syncSubscriptions();
      $('join-form').hidden = true; $('room-panel').hidden = false; $('room-title').textContent = '会議：' + meeting;
      try { await candidate.startAudio(); } catch (_) { $('play-audio').hidden = false; }
      try { await candidate.localParticipant.setMicrophoneEnabled(true); }
      catch (e) { if (current()) status(errorMessage(e) + ' 聞くだけの参加もできます。', true); }
      if (!current()) { await candidate.disconnect(); return; }
      busy = false; render();
      if (candidate.localParticipant.isMicrophoneEnabled) status('入室しました。マイクは入っています。カメラはボタンで入れられます。');
      $('leave').focus();
    } catch (e) {
      if (generation === ownGeneration) { reset(); status(errorMessage(e), true); }
      if (candidate) await candidate.disconnect();
    } finally { clearTimeout(timeout); if (generation === ownGeneration) { busy = false; $('join').disabled = false; } }
  }
  async function control(button, action) {
    if (!room || busy) return;
    var active = room;
    busy = true; ['mic', 'camera', 'audio'].forEach(function (id) { $(id).disabled = true; });
    try { await action(active); }
    catch (e) { if (room === active) status(errorMessage(e), true); }
    finally {
      busy = false;
      ['mic', 'camera', 'audio'].forEach(function (id) { $(id).disabled = false; });
      render();
    }
  }
  $('join-form').addEventListener('submit', join);
  $('mic').onclick = function () { control(this, async function (r) { await r.localParticipant.setMicrophoneEnabled(!r.localParticipant.isMicrophoneEnabled); }); };
  $('camera').onclick = function () { control(this, async function (r) { await r.localParticipant.setCameraEnabled(!r.localParticipant.isCameraEnabled); }); };
  $('audio').onclick = function () { control(this, async function (r) {
    var next = !audioOnly;
    if (next) await r.localParticipant.setCameraEnabled(false);
    if (room !== r) return;
    audioOnly = next; syncSubscriptions();
    status(next ? '音声優先にしました。映像の送受信は停止しています。' : '映像を受信します。自分のカメラはボタンで入れてください。');
  }); };
  $('auto').onclick = function () { pinned = null; render(); };
  $('play-audio').onclick = async function () { var active = room; if (!active) return; try { await active.startAudio(); if (room === active) $('play-audio').hidden = active.canPlaybackAudio; } catch (_) { status('音声を再生できません。端末の音量とブラウザの設定を確認してください。', true); } };
  function leave(message) { var previous = room; reset(message); if (previous) previous.disconnect(); }
  $('leave').onclick = function () { leave('退室しました。マイク・カメラを停止しました。'); $('name').focus(); };
  window.addEventListener('pagehide', function () { leave(); });
  $('compat').textContent = 'カメラ・マイク：' + (navigator.mediaDevices ? '対応' : '未対応') + ' ／ WebRTC：' + (window.RTCPeerConnection ? '対応' : '未対応');
  var meetingFromURL = new URLSearchParams(location.search).get('meeting');
  if (meetingFromURL && /^[a-zA-Z0-9_-]{1,48}$/.test(meetingFromURL)) $('meeting').value = meetingFromURL;
  // Never accept secrets or token endpoints from query parameters or browser storage.
  if (!ready()) status('このブラウザでは通話を開始できません。最新の Safari / Edge / Chrome で開いてください。SDKを読み込めない場合はネット接続も確認してください。', true);
  else if (!endpoint) status('主催者の接続設定待ちです。トークン発行サーバーを設定すると入室できます。', true);
  else {
    try { var parsed = new URL(endpoint); if (parsed.protocol !== 'https:') throw new Error(); $('join').disabled = false; status('お名前・会議番号・参加コードを入力してください。'); }
    catch (_) { status('接続先の設定に問題があります。主催者に確認してください。', true); }
  }
})();
