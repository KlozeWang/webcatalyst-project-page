'use strict';

// Keep the film usable independently of the demo gallery and its data requests.
(() => {
  const video = document.getElementById('explainer');
  const start = document.getElementById('video-start');
  const quality = document.getElementById('video-quality');
  const feedback = document.getElementById('video-feedback');
  const status = document.getElementById('video-status');
  const recovery = document.getElementById('video-recovery');
  let waitingTimer;
  let restorePosition;
  let wantsPlay = false;
  let fallbackAttempted = false;
  let request;
  let objectURL;
  let generation = 0;

  function message(text, recover = false) {
    status.textContent = text;
    feedback.hidden = false;
    recovery.hidden = !recover;
  }
  function clearFeedback() {
    clearTimeout(waitingTimer);
    feedback.hidden = true;
    recovery.hidden = true;
  }
  function loading() {
    clearTimeout(waitingTimer);
    message('Loading video…');
    waitingTimer = setTimeout(() => {
      message('The video is taking longer to load. Retry playback or open the video directly.', true);
    }, 12000);
  }
  function failed() {
    clearTimeout(waitingTimer);
    if (request) return;
    if (wantsPlay && !fallbackAttempted) {
      loadFreshCopy();
      return;
    }
    start.hidden = false;
    message('The video could not play. Retry playback, choose another quality, or open it directly.', true);
  }
  function play() {
    wantsPlay = true;
    const attempt = generation;
    loading();
    video.play().catch(error => {
      if (attempt !== generation || error.name === 'AbortError') return;
      if (error.name === 'NotAllowedError') {
        clearTimeout(waitingTimer);
        start.hidden = false;
        message('Video ready. Press play to start.');
      } else failed();
    });
  }
  function releaseCopy() {
    if (objectURL) URL.revokeObjectURL(objectURL);
    objectURL = undefined;
  }
  async function loadFreshCopy() {
    // Safari can reject a cached/ranged MP4 even though the complete file is
    // valid. Fetch one complete response and let its native player read a Blob.
    // Only do this after playback fails or the viewer explicitly retries.
    const attempt = ++generation;
    request?.abort();
    const controller = new AbortController();
    request = controller;
    fallbackAttempted = true;
    wantsPlay = true;
    restorePosition = video.currentTime || restorePosition;
    clearTimeout(waitingTimer);
    start.hidden = true;
    message('Loading a fresh copy of the video…');
    const timeout = setTimeout(() => controller.abort(), 60000);
    try {
      const response = await fetch(quality.value, { cache: 'no-store', signal: controller.signal });
      if (response.status !== 200) throw new Error(`Video response: ${response.status}`);
      const blob = await response.blob();
      if (!blob.size || /text\/|json/.test(blob.type)) throw new Error('Invalid video response');
      if (attempt !== generation) return;
      releaseCopy();
      objectURL = URL.createObjectURL(new Blob([blob], { type: 'video/mp4' }));
      request = undefined;
      video.src = objectURL;
      video.load();
      play();
    } catch (error) {
      if (attempt !== generation) return;
      request = undefined;
      failed();
    } finally {
      clearTimeout(timeout);
    }
  }

  start.hidden = false;
  document.getElementById('video-quality-label').hidden = false;
  start.addEventListener('click', () => video.error ? loadFreshCopy() : play());
  document.getElementById('video-retry').addEventListener('click', loadFreshCopy);
  quality.addEventListener('change', () => {
    const resume = wantsPlay && (!video.paused || Boolean(video.error) || Boolean(request));
    restorePosition = video.currentTime;
    generation++;
    request?.abort();
    request = undefined;
    fallbackAttempted = false;
    wantsPlay = resume;
    clearFeedback();
    video.src = quality.value;
    releaseCopy();
    document.getElementById('video-direct').href = quality.value;
    video.load();
    if (resume) play();
    else start.hidden = false;
  });
  video.addEventListener('loadedmetadata', () => {
    if (restorePosition && Number.isFinite(video.duration)) {
      video.currentTime = Math.min(restorePosition, video.duration);
    }
    restorePosition = undefined;
  });
  video.addEventListener('play', () => { wantsPlay = true; start.hidden = true; loading(); });
  video.addEventListener('playing', clearFeedback);
  video.addEventListener('waiting', () => { if (!video.paused && !request) loading(); });
  video.addEventListener('canplay', () => { if (!request) clearFeedback(); });
  video.addEventListener('pause', () => {
    if (request || video.error) return;
    wantsPlay = false;
    clearFeedback();
    start.hidden = video.currentTime > 0 && !video.ended;
  });
  video.addEventListener('ended', () => { wantsPlay = false; start.hidden = false; });
  video.addEventListener('error', failed);
  if (video.error) failed();
})();
