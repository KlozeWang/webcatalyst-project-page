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
      message('The video is taking longer to load. Try 720p, retry playback, or open the video directly.', true);
    }, 12000);
  }
  function failed() {
    clearTimeout(waitingTimer);
    start.hidden = false;
    message('The video could not load. Please retry, or open it directly.', true);
  }
  function play() {
    loading();
    video.play().catch(error => {
      // Source changes and user pauses can cancel a pending play request.
      if (error.name !== 'AbortError') failed();
    });
  }
  function reload() {
    restorePosition = video.currentTime || restorePosition;
    video.load();
    play();
  }

  start.hidden = false;
  document.getElementById('video-quality-label').hidden = false;
  start.addEventListener('click', () => video.error ? reload() : play());
  document.getElementById('video-retry').addEventListener('click', reload);
  quality.addEventListener('change', () => {
    const resume = !video.paused;
    restorePosition = video.currentTime;
    clearFeedback();
    video.src = quality.value;
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
  video.addEventListener('play', () => { start.hidden = true; loading(); });
  video.addEventListener('playing', clearFeedback);
  video.addEventListener('waiting', () => { if (!video.paused) loading(); });
  video.addEventListener('canplay', clearFeedback);
  video.addEventListener('pause', () => {
    clearTimeout(waitingTimer);
    if (!video.error) clearFeedback();
    start.hidden = video.currentTime > 0 && !video.ended;
  });
  video.addEventListener('ended', () => { start.hidden = false; });
  video.addEventListener('error', failed);
  if (video.error) failed();
})();
