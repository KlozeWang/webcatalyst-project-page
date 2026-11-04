// Regression tests for recovery from Safari MEDIA_ERR_DECODE and source changes.
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const assert = require('node:assert/strict');

function setup() {
  const ids = ['explainer', 'video-start', 'video-quality', 'video-feedback', 'video-status',
    'video-recovery', 'video-quality-label', 'video-retry', 'video-direct'];
  const elements = Object.fromEntries(ids.map(id => [id, {
    hidden: true, value: 'film.720p.mp4', listeners: {},
    addEventListener(name, fn) { this.listeners[name] = fn; },
    fire(name) { return this.listeners[name]?.(); }
  }]));
  const video = elements.explainer;
  Object.assign(video, { currentTime: 12, duration: 302, paused: false,
    play() { this.plays = (this.plays || 0) + 1; return this.rejectPlay ? Promise.reject(this.rejectPlay) : Promise.resolve(); },
    load() { this.error = null; this.loads = (this.loads || 0) + 1; }
  });
  const requests = [], revoked = [];
  runInNewContext(readFileSync('assets/js/explainer.js', 'utf8'), {
    document: { getElementById: id => elements[id] }, Blob, AbortController,
    URL: { createObjectURL: () => 'blob:fresh-film', revokeObjectURL: url => revoked.push(url) },
    fetch(url, options) {
      return new Promise((resolve, reject) => requests.push({ url, options, resolve, reject }));
    }, setTimeout: () => 1, clearTimeout() {}
  });
  return { elements, video, requests, revoked };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
const response = (status = 200) => ({ status, blob: async () => new Blob(['valid-media'], { type: 'video/mp4' }) });

(async () => {
  // A decode failure after user playback recovers exactly once with a full fetch.
  const a = setup();
  a.elements['video-start'].fire('click');
  a.video.error = { code: 3 };
  a.video.fire('error'); a.video.fire('error');
  assert.equal(a.requests.length, 1);
  assert.equal(a.requests[0].options.cache, 'no-store');
  a.requests[0].resolve(response()); await tick();
  assert.equal(a.video.src, 'blob:fresh-film');
  a.video.fire('loadedmetadata');
  assert.equal(a.video.currentTime, 12);
  a.video.fire('playing');
  assert.equal(a.elements['video-feedback'].hidden, true);
  a.video.error = { code: 3 }; a.video.fire('error');
  assert.equal(a.requests.length, 1, 'A bad Blob must not cause an infinite retry loop');
  assert.equal(a.elements['video-recovery'].hidden, false);

  // A late download must not overwrite a newer quality selection.
  const b = setup();
  b.elements['video-retry'].fire('click');
  b.elements['video-quality'].value = 'film.1080p.mp4';
  b.elements['video-quality'].fire('change');
  assert.equal(b.requests[0].options.signal.aborted, true);
  b.requests[0].resolve(response()); await tick();
  assert.equal(b.video.src, 'film.1080p.mp4');
  assert.equal(b.elements['video-direct'].href, 'film.1080p.mp4');

  // Safari may require a second click after asynchronous recovery; expose it.
  const c = setup();
  c.video.rejectPlay = { name: 'NotAllowedError' };
  c.elements['video-start'].fire('click'); await tick();
  assert.equal(c.elements['video-start'].hidden, false);
  assert.equal(c.requests.length, 0);
  assert.match(c.elements['video-status'].textContent, /Press play/);

  // A partial response cannot be passed off as a complete playable file.
  const d = setup();
  d.elements['video-retry'].fire('click');
  d.requests[0].resolve(response(206)); await tick();
  assert.equal(d.video.src, undefined);
  assert.equal(d.elements['video-recovery'].hidden, false);
  console.log('Passed: decode recovery, duplicate errors, seek restore, source-change cancellation, user gesture, partial-response rejection.');
})();
