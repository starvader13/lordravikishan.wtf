/* ===================================================================
   Site config — the one file you should need to touch to customize
   this site. Everything else (app.js, background.js) is the engine
   that reads these values; it shouldn't need editing for day-to-day
   changes like swapping the playlist, the background image, or the
   memes.

   Loaded first (see index.html) so app.js/background.js can reference
   these as plain globals — no build step, no imports, just script
   load order.
   =================================================================== */

/* Shown in the browser tab and appended to the now-playing title. */
const SITE_NAME = "Lord Ravi Kishan Playlist";

/* ---------------------------------------------------------------
   Song playlist
   ---------------------------------------------------------------
   Option A (recommended once you have a real playlist): set PLAYLIST_ID
   to the "list=" value from a YouTube playlist URL, e.g.
     https://www.youtube.com/playlist?list=PLxxxxxxxxxxxxxxxx
                                            ^^^^^^^^^^^^^^^^^^ this part
   and leave TRACKS alone — it's ignored whenever PLAYLIST_ID is set.

   PLAYLIST_START_VIDEO_ID must be one of the playlist's own video ids
   (the embed needs a real starting video, not just the playlist id —
   see the comment above embedUrl() in app.js for why). Shuffle is on
   by default (player.setShuffle(true) in app.js), so this only decides
   which track plays first each visit — everything after it via
   next/previous follows shuffle order.

   Option B (used below as a placeholder): leave PLAYLIST_ID empty and
   list individual video ids in TRACKS. Title/artist here are hand-typed
   like roadways.wtf does, because YouTube's own video titles are rarely
   clean enough to show in a one-line player pill. */
const PLAYLIST_ID = "PLbLakOgKWDq4"; // "ravi lord", 25 videos
const PLAYLIST_START_VIDEO_ID = "r4Ca_3l9o4Q"; // "Lehariya Luta Ae Raja"

const TRACKS = [
  { youtubeId: "dQw4w9WgXcQ", title: "Never Gonna Give You Up", artist: "Rick Astley" },
  { youtubeId: "9bZkp7q19f0", title: "Gangnam Style", artist: "PSY" },
  { youtubeId: "kJQP7kiw5Fk", title: "Despacito", artist: "Luis Fonsi ft. Daddy Yankee" },
];

/* ---------------------------------------------------------------
   Meme mode
   ---------------------------------------------------------------
   A handful of YouTube Shorts, shown visibly (unlike the hidden song
   iframe) with their own sound. Grab the id from the Shorts URL:
     https://www.youtube.com/shorts/<11-char-id> */
const MEMES = [
  { youtubeId: "Lsc6QBj29ts", caption: "Okay I promise this is the last one 😂" },
  { youtubeId: "DgR5ucS4rJY", caption: "You have to do it bro" },
  { youtubeId: "rP0TRyZtjsk", caption: "Ravi Kishan Singing in White Outfit" },
  { youtubeId: "0C7zQX9m6R4", caption: "Moun Vrat Hai Doston" },
];

/* ---------------------------------------------------------------
   Background
   ---------------------------------------------------------------
   Each layer fills the screen exactly by stretching, not cropping (see
   .bg-layer in styles.css). Add more entries to cycle between several
   images/gifs; a single entry just sits there.

     { type: "gif", src: "/assets/gifs/city-night.gif", motion: "x", duration: 30 }
     { type: "gradient", css: "radial-gradient(...)", motion: "y", duration: 24 }

   motion:    "x" pans left-right, "y" pans up-down, omit/false for a
              fully static layer (the default).
   duration:  seconds for one pan sweep, only used when motion is set
              (it reverses forever via animation-direction: alternate,
              so this is half the full back-and-forth cycle). */
const BACKGROUND_LAYERS = [
  {
    type: "gif",
    src: "/lord-ravi-kishan.jpeg",
  },
];

/* How long each background layer stays active before the next one
   crossfades in. Irrelevant with a single layer. */
const BACKGROUND_CYCLE_MS = 9000;
