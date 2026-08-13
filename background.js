/* ===================================================================
   Engine — builds and cycles the background layers from
   BACKGROUND_LAYERS/BACKGROUND_CYCLE_MS in config.js (loaded first,
   see index.html). Shouldn't need editing to change what's shown —
   that's what config.js is for.
   =================================================================== */

(() => {
  const host = document.getElementById("hero-bg");
  const scrim = host.querySelector(".scrim");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const els = BACKGROUND_LAYERS.map((layer) => {
    const el = document.createElement("div");
    el.className = "bg-layer";
    if (layer.motion && !reducedMotion) {
      el.classList.add("has-motion", `pan-${layer.motion}`);
      el.style.setProperty("--pan-duration", `${layer.duration || 26}s`);
    }
    el.style.backgroundImage =
      layer.type === "gif" ? `url("${layer.src}")` : layer.css;
    host.insertBefore(el, scrim);
    return el;
  });

  if (els.length === 0) return;

  let current = 0;
  els[current].classList.add("is-active");

  if (els.length > 1 && !reducedMotion) {
    setInterval(() => {
      const next = (current + 1) % els.length;
      els[next].classList.add("is-active");
      els[current].classList.remove("is-active");
      current = next;
    }, BACKGROUND_CYCLE_MS);
  }
})();
