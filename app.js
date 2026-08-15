/* ===================================================================
   Engine — song player, meme player, clock, mode toggle. Reads its
   settings from config.js (loaded first, see index.html); you
   shouldn't need to edit anything below to customize the site.
   =================================================================== */

const PLAYLIST_MODE = Boolean(PLAYLIST_ID);

/* ---------------------------------------------------------------
   Clock
   --------------------------------------------------------------- */

function tickClock() {
  const now = new Date();
  let h = now.getHours();
  const ap = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  document.getElementById("clock-h").textContent = String(h);
  document.getElementById("clock-m").textContent = String(now.getMinutes()).padStart(2, "0");
  document.getElementById("clock-ap").textContent = ap;
}

tickClock();
setInterval(tickClock, 1000);

/* ---------------------------------------------------------------
   Shared elements & state
   --------------------------------------------------------------- */

const el = (id) => document.getElementById(id);

const card = el("player-card");
const seek = el("seek");
const playBtn = el("play");
const prevBtn = el("prev");
const nextBtn = el("next");
const ytLink = el("yt-link");
const modeToggle = el("mode-toggle");
const modeToggleLabel = el("mode-toggle-label");
const modeToggleIcon = el("mode-toggle-icon");
const memeStage = el("meme-stage");
const memeFrame = el("meme-frame");
const memePrevBtn = el("meme-prev");
const memeNextBtn = el("meme-next");
const memeCloseBtn = el("meme-close");
const memeCaption = el("meme-caption");
const memeDots = el("meme-dots");

let player = null;
let ready = false;
let scrubbing = false;
let index = 0;

let memePlayer = null;
let memeReady = false;
let memeIndex = 0;
let mode = "song"; // "song" | "meme"

/* ---------------------------------------------------------------
   Party mode (screen shake)
   ---------------------------------------------------------------
   Purely cosmetic layer over whatever's actually playing — see
   .is-shaking in styles.css. Driven from the song and meme players'
   onStateChange below, not from mode switches directly, so it only
   kicks in while something is truly playing (not just whichever tab
   is open).
   --------------------------------------------------------------- */

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let shakeTimer = null;

function scheduleShake() {
  const delay = 6000 + Math.random() * 6000; // every 6-12s while the party's on
  shakeTimer = setTimeout(() => {
    document.body.classList.add("is-shaking");
    setTimeout(() => document.body.classList.remove("is-shaking"), 400);
    scheduleShake();
  }, delay);
}

function setPartyMode(active) {
  if (active) {
    if (!reducedMotion && !shakeTimer) scheduleShake();
  } else {
    clearTimeout(shakeTimer);
    shakeTimer = null;
    document.body.classList.remove("is-shaking");
  }
}

function fmt(seconds) {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/* ---------------------------------------------------------------
   Song player
   --------------------------------------------------------------- */

function setProgress(ratio) {
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  seek.style.setProperty("--progress", `${pct}%`);
  if (!scrubbing) seek.value = String(Math.round(pct * 10));
}

/* In track-list mode we already know title/artist/cover before playback
   starts. In playlist mode we only find out once the iframe actually loads
   the video, so this gets called again from onStateChange there. */
function renderTrack(videoId, title, artist) {
  el("track-title").textContent = title || "Loading…";
  el("track-artist").textContent = artist || "";
  el("cover").src = videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "";
  document.title = title ? `${title} — ${SITE_NAME}` : SITE_NAME;
  ytLink.href = videoId ? `https://www.youtube.com/watch?v=${videoId}` : "https://www.youtube.com/";
  publishMediaSession(videoId, title, artist);
  // Swaps the shimmering skeleton for the real disc/title once there's
  // actual data to show — see .player.is-loading in styles.css.
  if (title) card.classList.remove("is-loading");
}

function publishMediaSession(videoId, title, artist) {
  if (!("mediaSession" in navigator) || !title) return;

  navigator.mediaSession.metadata = new MediaMetadata({
    title,
    artist: artist || "",
    artwork: videoId
      ? [{ src: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`, sizes: "480x360", type: "image/jpeg" }]
      : [],
  });

  const bind = (action, fn) => {
    try {
      navigator.mediaSession.setActionHandler(action, fn);
    } catch {
      /* not every action is supported everywhere */
    }
  };

  bind("play", () => ready && player.playVideo());
  bind("pause", () => ready && player.pauseVideo());
  bind("previoustrack", () => prevBtn.click());
  bind("nexttrack", () => nextBtn.click());
}

function loadTrack(i) {
  index = (i + TRACKS.length) % TRACKS.length;
  const t = TRACKS[index];
  renderTrack(t.youtubeId, t.title, t.artist);
  if (ready) player.loadVideoById(t.youtubeId);
  prevBtn.disabled = nextBtn.disabled = TRACKS.length < 2;
}

if (!PLAYLIST_MODE) renderTrack(TRACKS[0].youtubeId, TRACKS[0].title, TRACKS[0].artist);

/* Built by hand so the iframe keeps the allow list already set in the
   markup — passing an element id to YT.Player instead makes the API
   replace the element with its own iframe, which re-grants
   picture-in-picture. */
function embedUrl() {
  const params = new URLSearchParams({
    enablejsapi: "1",
    controls: "0",
    disablekb: "1",
    playsinline: "1",
    rel: "0",
    modestbranding: "1",
    origin: location.origin,
  });

  if (PLAYLIST_MODE) {
    // Attaching the JS API to a pre-built iframe (rather than letting the
    // API construct its own, which would blow away our custom `allow`
    // attribute) turns out to only reliably wire up for playlists when the
    // src names a real starting video with `list` alongside it. Both
    // /embed?listType=playlist&list=... and /embed/videoseries?list=...
    // load a valid-looking page, but left the player stuck unstarted —
    // getDuration()/playVideo() never actually did anything, so the seek
    // bar sat frozen at 0:00. This form is the same mechanism the
    // single-video case already uses, just with playlist context attached.
    params.set("list", PLAYLIST_ID);
    return `https://www.youtube.com/embed/${PLAYLIST_START_VIDEO_ID}?${params}`;
  }

  return `https://www.youtube.com/embed/${TRACKS[0].youtubeId}?${params}`;
}

/* ---------------------------------------------------------------
   Meme player
   --------------------------------------------------------------- */

/* Unlike the hidden song iframe, this one keeps YouTube's own controls
   (controls: "1" — the default) since you're meant to look at and interact
   with it directly, e.g. to skip an ad or replay a clip. */
function memeEmbedUrl(youtubeId) {
  const params = new URLSearchParams({
    enablejsapi: "1",
    playsinline: "1",
    rel: "0",
    modestbranding: "1",
    origin: location.origin,
  });
  return `https://www.youtube.com/embed/${youtubeId}?${params}`;
}

/* One dot per meme, built once — loadMeme() below just toggles which
   one carries .is-active rather than re-rendering the list each time. */
memeDots.replaceChildren(
  ...MEMES.map(() => {
    const dot = document.createElement("span");
    dot.className = "dot";
    return dot;
  })
);
memeDots.classList.toggle("is-hidden", MEMES.length < 2);

function loadMeme(i) {
  memeIndex = (i + MEMES.length) % MEMES.length;
  const m = MEMES[memeIndex];
  memeCaption.textContent = m.caption || "";
  memeDots.querySelectorAll(".dot").forEach((dot, n) => dot.classList.toggle("is-active", n === memeIndex));
  if (memeReady) {
    // Brief opacity dip around the swap so the new clip fades in rather
    // than jump-cutting the moment loadVideoById() replaces the frame.
    memeFrame.classList.add("is-switching");
    memePlayer.loadVideoById(m.youtubeId);
    setTimeout(() => memeFrame.classList.remove("is-switching"), 220);
  }
  memePrevBtn.disabled = memeNextBtn.disabled = MEMES.length < 2;
}

/* ---------------------------------------------------------------
   Mode toggle (song <-> meme)
   --------------------------------------------------------------- */

/* Switching modes pauses whichever player is losing focus and resumes the
   other, so the song and a meme's own audio are never both running. */
function setMode(next) {
  if (next === mode) return;
  // Reset unconditionally rather than relying on the outgoing player's own
  // pause event: that event lands after `mode` has already flipped below,
  // so a mode-gated setPartyMode(false) there would silently no-op and,
  // if the incoming player isn't ready yet to fire its own PLAYING event,
  // leave the page shaking forever with nothing playing.
  setPartyMode(false);
  mode = next;

  if (mode === "meme") {
    if (ready) player.pauseVideo();
    card.classList.add("is-hidden");
    memeStage.classList.add("is-active");
    modeToggleIcon.textContent = "🎵";
    modeToggleLabel.textContent = "Song";
    modeToggle.setAttribute("aria-label", "Switch to song");
    loadMeme(memeIndex);
    if (memeReady) memePlayer.playVideo();
  } else {
    if (memeReady) memePlayer.pauseVideo();
    memeStage.classList.remove("is-active");
    card.classList.remove("is-hidden");
    modeToggleIcon.textContent = "🎭";
    modeToggleLabel.textContent = "Memes";
    modeToggle.setAttribute("aria-label", "Switch to memes");
    if (ready) player.playVideo();
  }
}

modeToggle.addEventListener("click", () => setMode(mode === "song" ? "meme" : "song"));
memePrevBtn.addEventListener("click", () => loadMeme(memeIndex - 1));
memeNextBtn.addEventListener("click", () => loadMeme(memeIndex + 1));
memeCloseBtn.addEventListener("click", () => setMode("song"));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && mode === "meme") setMode("song");
});

/* ---------------------------------------------------------------
   YouTube IFrame API bootstrap
   --------------------------------------------------------------- */

window.onYouTubeIframeAPIReady = function () {
  const iframe = el("yt-player");
  iframe.src = embedUrl();

  player = new YT.Player(iframe, {
    events: {
      onReady: () => {
        ready = true;
        el("duration").textContent = fmt(player.getDuration());
        if (PLAYLIST_MODE) {
          const list = player.getPlaylist() || [];
          prevBtn.disabled = nextBtn.disabled = list.length < 2;
          // The player loads straight into UNSTARTED and sits there until
          // played — onStateChange's PLAYING/CUED check never fires on its
          // own, so the disc/title/cover would stay blank until you hit
          // play. getVideoData() already has real metadata at this point,
          // so pull it directly rather than waiting for a state change.
          const data = player.getVideoData() || {};
          renderTrack(data.video_id, data.title, data.author);
          // On by default — the site always starts on PLAYLIST_START_VIDEO_ID,
          // but nextVideo()/previousVideo() from here on follow shuffle order.
          player.setShuffle(true);
        }
      },
      onStateChange: (e) => {
        const S = YT.PlayerState;

        if (PLAYLIST_MODE && (e.data === S.PLAYING || e.data === S.CUED)) {
          const data = player.getVideoData() || {};
          renderTrack(data.video_id, data.title, data.author);
        }

        if (e.data === S.PLAYING) {
          card.classList.add("is-playing");
          playBtn.setAttribute("aria-label", "Pause");
          el("duration").textContent = fmt(player.getDuration());
          if (mode === "song") setPartyMode(true);
        } else {
          card.classList.remove("is-playing");
          playBtn.setAttribute("aria-label", "Play");
          if (mode === "song") setPartyMode(false);
        }

        if ("mediaSession" in navigator) {
          navigator.mediaSession.playbackState = e.data === S.PLAYING ? "playing" : "paused";
        }

        if (e.data === S.ENDED && !PLAYLIST_MODE) {
          if (TRACKS.length > 1) loadTrack(index + 1);
          else player.seekTo(0, true);
          player.playVideo();
        }
      },
    },
  });

  const memeIframe = el("meme-player");
  memeIframe.src = memeEmbedUrl(MEMES[memeIndex].youtubeId);
  memePlayer = new YT.Player(memeIframe, {
    events: {
      onReady: () => {
        memeReady = true;
      },
      onStateChange: (e) => {
        // Auto-advance through the meme list, the way a Shorts feed does.
        if (e.data === YT.PlayerState.ENDED) loadMeme(memeIndex + 1);
        if (mode === "meme") setPartyMode(e.data === YT.PlayerState.PLAYING);
      },
    },
  });
};

const ytTag = document.createElement("script");
ytTag.src = "https://www.youtube.com/iframe_api";
document.head.appendChild(ytTag);

/* ---------------------------------------------------------------
   Progress loop
   --------------------------------------------------------------- */

setInterval(() => {
  if (!ready || scrubbing) return;
  const dur = player.getDuration();
  const cur = player.getCurrentTime();
  if (!dur) return;
  el("elapsed").textContent = fmt(cur);
  el("duration").textContent = fmt(dur);
  setProgress(cur / dur);
}, 250);

/* ---------------------------------------------------------------
   Controls
   --------------------------------------------------------------- */

playBtn.addEventListener("click", () => {
  if (!ready) return;
  const S = YT.PlayerState;
  if (player.getPlayerState() === S.PLAYING) player.pauseVideo();
  else player.playVideo();
});

prevBtn.addEventListener("click", () => {
  if (!ready) return;
  if (PLAYLIST_MODE) {
    player.previousVideo();
    return;
  }
  if (player.getCurrentTime() > 3) player.seekTo(0, true);
  else loadTrack(index - 1);
});

nextBtn.addEventListener("click", () => {
  if (!ready) return;
  if (PLAYLIST_MODE) player.nextVideo();
  else loadTrack(index + 1);
});

seek.addEventListener("input", () => {
  scrubbing = true;
  setProgress(Number(seek.value) / 1000);
});

seek.addEventListener("change", () => {
  if (ready) {
    const dur = player.getDuration();
    if (dur) player.seekTo((Number(seek.value) / 1000) * dur, true);
  }
  scrubbing = false;
});

/* Keyboard: space play/pause, arrows for tracks. No UI hint for this on
   purpose — it just works like a music app. Skipped when focus is on a
   control so the browser's own key handling stays intact. */
document.addEventListener("keydown", (e) => {
  if (e.target.closest("input, button, a")) return;

  if (e.code === "Space") {
    e.preventDefault();
    playBtn.click();
  } else if (e.code === "ArrowRight") {
    nextBtn.click();
  } else if (e.code === "ArrowLeft") {
    prevBtn.click();
  }
});
