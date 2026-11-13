// Deterministic UI test double. This does not simulate a real WebRTC call.
(function () {
  const events = ['TrackSubscribed', 'TrackUnsubscribed', 'ParticipantConnected', 'ParticipantDisconnected', 'TrackPublished', 'TrackUnpublished', 'TrackMuted', 'TrackUnmuted', 'LocalTrackPublished', 'LocalTrackUnpublished', 'ActiveSpeakersChanged', 'Reconnecting', 'Reconnected', 'Disconnected', 'AudioPlaybackStatusChanged', 'MediaDevicesError'];
  const RoomEvent = Object.fromEntries(events.map(e => [e, e]));
  class Participant {
    constructor(identity, name, room) {
      Object.assign(this, { identity, name, room, isMicrophoneEnabled: false, isCameraEnabled: false, isSpeaking: false, videoTrackPublications: new Map(), audioTrackPublications: new Map() });
    }
    getTrackPublication() { return this.camera; }
    async setMicrophoneEnabled(value) { if (window.denyMic) throw Object.assign(new Error(), { name: 'NotAllowedError' }); this.isMicrophoneEnabled = value; }
    async setCameraEnabled(value) { this.isCameraEnabled = value; }
  }
  function publication() { return { isMuted: false, track: null, subscribed: false, get isDesired() { return this.subscribed; }, setSubscribed(value) { this.subscribed = value; }, setVideoQuality(value) { this.quality = value; } }; }
  window.makeTestTrack = function (kind, sid) {
    const elements = new Set();
    return { kind, sid, attach() { const el = document.createElement(kind === 'audio' ? 'audio' : 'video'); elements.add(el); return el; }, detach(el) { const result = el ? [el] : Array.from(elements); result.forEach(e => elements.delete(e)); return result; } };
  };
  class Room {
    constructor(options) {
      window.testRoom = this;
      this.options = options; this.events = {}; this.canPlaybackAudio = false;
      this.localParticipant = new Participant('local', 'さくら', this);
      this.remoteParticipants = new Map();
      ['remote1', 'remote2'].forEach((id, i) => {
        const p = new Participant(id, i ? '花子' : '太郎', this);
        p.camera = publication(); p.videoTrackPublications.set('video', p.camera);
        p.audioTrackPublications.set('audio', publication()); this.remoteParticipants.set(id, p);
      });
    }
    on(event, fn) { (this.events[event] ||= []).push(fn); return this; }
    emit(event, ...args) { (this.events[event] || []).forEach(fn => fn(...args)); }
    async connect(url, token, options) { this.connectOptions = options; if (window.failConnect) throw new Error('connection'); }
    async startAudio() { this.canPlaybackAudio = !window.blockAudio; this.emit('AudioPlaybackStatusChanged'); if (!this.canPlaybackAudio) throw new Error('blocked'); }
    async disconnect() { this.disconnected = true; this.localParticipant.isMicrophoneEnabled = false; this.localParticipant.isCameraEnabled = false; this.emit('Disconnected'); }
  }
  window.LivekitClient = { Room, RoomEvent, isBrowserSupported: () => true, supportsAdaptiveStream: () => true, supportsDynacast: () => true, Track: { Source: { Camera: 'camera' }, Kind: { Audio: 'audio' } }, VideoQuality: { LOW: 0, HIGH: 2 } };
})();
