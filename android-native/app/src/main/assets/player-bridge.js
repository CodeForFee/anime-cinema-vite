/**
 * Runs inside the source's player page (storage.googleapiscdn.com/player/...), in the page's own JS
 * world, at document start. Injected by the Android app (MainActivity.java) and by the AVS Helper
 * extension (manifest content script). It only acts when the page was embedded by this app, which
 * tags the frame URL with "#animevsub-vsub"; anywhere else it does nothing.
 *
 *  1. Ad shield. Same rules as animevietsub-adshield-extension (injected.js) and the cleanup
 *     backend-hono used to inject into the player page (avs-adshield-css / avs-adshield-js).
 *     Ad requests themselves are blocked at the network layer (MainActivity / extension rules).
 *  2. Remote control. Lets src/features/player/engines/iframe-bridge.ts drive the <video> by postMessage
 *     (play, pause, seek, rate, volume, quality), so the app draws its own controls; it reports the
 *     position, the buffer ahead and JW Player's quality levels back. The player's controls are hidden
 *     only after the app says hello.
 */
(function () {
  "use strict";
  if (window.top === window || window.__avsBridge || !/animevsub-vsub/.test(location.hash)) return;
  window.__avsBridge = true;

  /* ---------- 1. Ad shield ---------- */

  // Anti-adblock checks read these
  window.canRunAds = true;
  window.isAdBlocked = false;
  window.avsAdLoaded = true;
  window.AdProvider = { isBlocked: false, isReady: true, loaded: true };
  window.adsConfig = "";
  window.otherpop = [];
  window.otherpopmax = 0;
  window.pop = function () { return false; };

  // Detectors that measure a bait element must not see it collapsed
  function isAdDetector(el) {
    var id = (el.id || "").toLowerCase();
    var cls = (el.className || "").toString().toLowerCase();
    return id.includes("tester") || id.includes("ad-detector") || id.includes("ad_test") ||
      cls.includes("ads_player") || cls.includes("ads_test") || cls.includes("ad-tester");
  }
  [["offsetHeight", 250], ["offsetWidth", 300], ["clientHeight", 250], ["clientWidth", 300]].forEach(function (pair) {
    var original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, pair[0]);
    if (!original || !original.get) return;
    Object.defineProperty(HTMLElement.prototype, pair[0], {
      configurable: true,
      get: function () { return isAdDetector(this) ? pair[1] : original.get.call(this); }
    });
  });

  // In-player overlays, popups and nag dialogs. Nothing in this frame legitimately opens a window.
  window._initBannerOverlay = function () {};
  window._initPauseAdOverlay = function () {};
  window.open = function () { return null; };
  window.alert = function () {};
  window.confirm = function () { return false; };

  // Strip the ad schedule from the JW Player setup
  var jw = window.jwplayer;
  try {
    Object.defineProperty(window, "jwplayer", {
      configurable: true,
      get: function () { return jw; },
      set: function (real) {
        jw = function (id) {
          var instance = real(id);
          if (instance && instance.setup) {
            var setup = instance.setup;
            instance.setup = function (options) {
              if (options && typeof options === "object") {
                delete options.advertising;
                delete options.schedule;
                delete options.adschedule;
                delete options.vast;
              }
              return setup.call(this, options);
            };
          }
          return instance;
        };
        for (var key in real) if (Object.prototype.hasOwnProperty.call(real, key)) jw[key] = real[key];
      }
    });
  } catch (e) { /* already defined and locked: the CSS and purge below still apply */ }

  var AD_CSS =
    "marquee,.marquee,[class*='marquee'],[id*='marquee']," +
    "div:has(> a[href*='bit.ly']),a[href*='bit.ly']," +
    "div:has(> a[href*='bom88']),a[href*='bom88']," +
    "div:has(> img[src*='logo']:not([class*='jw']))," +
    ".jw-banner,.jw-vast-nonlinear-open-button,.jw-vast-nonlinear-close-button," +
    ".jw-ad-container,.jw-ads,.jw-plugin-vast," +
    "[class*='vast'],[id*='vast'],[class*='pause-ad'],[id*='pause-ad']," +
    "[class*='adv-'],[id*='adv-'],#banner-overlay,.banner-overlay," +
    "div[style*='z-index: 9999']:not(.jwplayer):not(.jw-reset)," +
    "div[style*='z-index: 2147483647']:not(.jwplayer):not(.jw-reset)," +
    "a[href*='bet'],a[href*='game']:not([class*='jw'])" +
    "{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;" +
    "width:0!important;height:0!important;max-height:0!important;overflow:hidden!important}" +
    "html,body,#player,.jwplayer{background:#000!important;width:100%!important;height:100%!important;" +
    "margin:0!important;padding:0!important;overflow:hidden!important}";
  // Applied once the app has taken over the controls
  var CONTROLS_CSS =
    ".jw-controls,.jw-controls-backdrop,.jw-title,.jw-logo,.jw-nextup-container{display:none!important}";

  function addStyle(id, css) {
    if (document.getElementById(id)) return;
    var style = document.createElement("style");
    style.id = id;
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  }
  addStyle("avs-adshield-css", AD_CSS);

  var AD_TAGS = "div, a, img, iframe, span, button, p, marquee";
  function isAd(el) {
    // never the player, and never a wrapper holding it or a script: textContent would read their code too
    if (el.tagName === "VIDEO" || el.closest(".jwplayer") || el.querySelector(".jwplayer, video, script")) return false;
    var text = (el.textContent || "").trim().toLowerCase();
    var href = (el.getAttribute("href") || "").toLowerCase();
    var src = (el.getAttribute("src") || "").toLowerCase();
    var id = (el.id || "").toLowerCase();
    var cls = (el.className || "").toString().toLowerCase();
    return text.includes("đóng và xem") || text.includes("bom88") || text.includes("truy cập bit.ly") ||
      href.includes("bit.ly") || href.includes("bom88") || src.includes("bom88") ||
      id.includes("banner-overlay") || cls.includes("pause-ad") || cls.includes("jw-banner");
  }
  // Only what was just added is looked at, and textContent needs no layout: the old 500 ms sweep read innerText of
  // every element, a forced layout that (in the Android WebView) ran on the same thread as the app's animations
  function purge(root) {
    if (!root || root.nodeType !== 1) return;
    try {
      var list = root.matches(AD_TAGS) ? [root] : [];
      list.concat(Array.prototype.slice.call(root.querySelectorAll(AD_TAGS))).forEach(function (el) {
        if (el.isConnected && isAd(el)) el.remove();
      });
    } catch (e) { /* the page is still loading */ }
  }
  // what was added (checked with its subtree), and what changed after it was added (checked alone): an ad
  // inserted empty and filled, or given its link, later
  var added = new Set();
  var changed = new Set();
  var flushing = false;
  new MutationObserver(function (records) {
    records.forEach(function (record) {
      if (record.type === "childList") {
        record.addedNodes.forEach(function (node) {
          if (node.nodeType === 1) added.add(node);
          else if (node.parentElement) changed.add(node.parentElement);
        });
      } else {
        var target = record.type === "characterData" ? record.target.parentElement : record.target;
        if (target) changed.add(target);
      }
    });
    if (flushing) return;
    flushing = true;
    setTimeout(function () {
      flushing = false;
      addStyle("avs-adshield-css", AD_CSS); // the page may replace <head>
      added.forEach(purge);
      changed.forEach(function (el) {
        try { if (el.isConnected && el.matches(AD_TAGS) && isAd(el)) el.remove(); } catch (e) { /* detached */ }
      });
      added.clear();
      changed.clear();
    }, 50);
  }).observe(document.documentElement, {
    childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["href", "src", "class", "id"]
  });
  document.addEventListener("DOMContentLoaded", function () { purge(document.body); });

  /* ---------- 2. Remote control ---------- */

  var BRIDGE = "avs-player-bridge";
  var APP = "avs-player-app";
  var controlled = false;
  var video = null;
  // not `jw`: that name is the ad shield's (section 1), and `var` would make the two one variable
  var jwApi = null;

  /** Seconds already buffered ahead of the playhead */
  function ahead() {
    var ranges = video.buffered;
    for (var i = 0; i < ranges.length; i++) {
      if (ranges.start(i) <= video.currentTime + 0.5 && ranges.end(i) > video.currentTime) return ranges.end(i) - video.currentTime;
    }
    return 0;
  }

  function send(type, data) {
    try { window.parent.postMessage(Object.assign({ source: BRIDGE, type: type }, data), "*"); } catch (e) { /* parent gone */ }
  }

  function report() {
    if (!video) return;
    send("state", {
      currentTime: video.currentTime || 0,
      duration: isFinite(video.duration) ? video.duration : 0,
      paused: video.paused,
      waiting: !video.paused && video.readyState < 3,
      rate: video.playbackRate,
      volume: video.muted ? 0 : video.volume,
      ended: video.ended,
      ahead: ahead()
    });
  }

  // The player's own "Xem tiếp / Từ đầu" box sits under the app's overlay where it cannot be tapped:
  // hide it, tell the app the time it offers, and press its button for the app ("resume" 1 / 0)
  var resumeOffered = null;
  function forwardResumeOffer() {
    var box = document.getElementById("avs-resume-overlay");
    if (!box || box === resumeOffered) return;
    var time = box.querySelector(".avs-time");
    var parts = ((time && time.textContent) || "").trim().split(":").map(Number);
    if (parts.length < 2 || parts.some(isNaN)) return;
    resumeOffered = box;
    box.style.setProperty("visibility", "hidden", "important");
    send("resume", { at: parts.reduce(function (sum, part) { return sum * 60 + part; }, 0) });
  }

  // The player's own quality levels, through JW Player's public API (the menu it shows itself, hidden here):
  // the app lists them, picks one, and hears which one actually plays as the automatic choice moves
  function levels() {
    var list = jwApi.getQualityLevels() || [];
    send("levels", {
      levels: list.map(function (level, index) { return { index: index, label: String(level.label || ""), height: level.height || 0 }; }),
      current: jwApi.getCurrentQuality()
    });
  }
  function hookQuality() {
    if (jwApi || typeof window.jwplayer !== "function") return;
    var api;
    try { api = window.jwplayer(); } catch (e) { return; }
    if (!api || typeof api.on !== "function" || typeof api.getQualityLevels !== "function") return;
    jwApi = api;
    api.on("levels", levels);
    api.on("levelsChanged", levels);
    api.on("visualQuality", function (event) {
      var level = (event && event.level) || {};
      send("visual", { label: String(level.label || ""), height: level.height || 0, auto: event && event.mode === "auto" });
    });
    if ((api.getQualityLevels() || []).length) levels();
  }

  // Picture/sound enhancers (public/player-enhance.js, injected next to this file): the app sends the viewer's
  // choice ("enhance"), it is applied to the current <video> and re-applied when the player swaps it, and what
  // actually runs comes back as "enhanced". No enhancer script (old extension/app): "enhanced" with an error.
  var enhanceWanted = null;
  var enhancer = null;
  var enhancedVideo = null;
  function applyEnhance() {
    if (!enhanceWanted || !video) return;
    var lib = window.__capyEnhance;
    if (!lib) { send("enhanced", { surround: false, upscale: "off", support: null, error: "outdated" }); return; }
    if (enhancedVideo !== video) {
      if (enhancer) enhancer.destroy();
      enhancedVideo = video;
      enhancer = lib.createEnhancer(video, function (state) { send("enhanced", state); });
    }
    enhancer.set(enhanceWanted).then(function (state) { send("enhanced", state); }, function (error) {
      send("enhanced", { surround: false, upscale: "off", support: null, error: String((error && error.message) || error) });
    });
  }

  function attach() {
    forwardResumeOffer();
    var found = document.querySelector("video.jwApi-video") || document.querySelector("video");
    if (found) hookQuality(); // only a set-up player has a <video>; before that jwplayer() may be a stub
    if (!found || found === video) return;
    video = found;
    applyEnhance();
    ["play", "playing", "pause", "waiting", "seeked", "ratechange", "durationchange", "ended", "timeupdate", "volumechange", "progress"]
      .forEach(function (name) { video.addEventListener(name, report); });
    report();
  }

  window.addEventListener("message", function (event) {
    var message = event.data;
    if (event.source !== window.parent || !message || message.source !== APP) return;

    // "hello": the app draws the controls (touch); "observe": the player keeps its own, the app only
    // follows the position (resume, next episode) and may seek
    if (message.type === "hello" || message.type === "observe") {
      var hide = message.type === "hello";
      if (!controlled) {
        controlled = true;
        setInterval(function () {
          if (hide) addStyle("avs-controls-css", CONTROLS_CSS);
          attach();
        }, 500);
      }
      if (hide) addStyle("avs-controls-css", CONTROLS_CSS);
      attach();
      send("ready");
      report();
      return;
    }
    if (!controlled) return;
    // the player loads the video only after its resume box is answered: no <video> needed for this one
    if (message.type === "resume") {
      var button = document.getElementById(message.value ? "avs-resume-btn-yes" : "avs-resume-btn-no");
      if (button) button.click();
      return;
    }
    if (message.type === "enhance") {
      var wanted = message.value || {};
      var modes = ["off", "fsr", "anime4k"];
      enhanceWanted = {
        surround: wanted.surround === true,
        surroundMode: wanted.surroundMode === "speakers" ? "speakers" : "headphones",
        upscale: modes.indexOf(wanted.upscale) >= 0 ? wanted.upscale : "off",
        color: wanted.color === true,
        lite: wanted.lite === true,
        mobile: wanted.mobile === true
      };
      applyEnhance(); // without a <video> yet, attach() applies it once one appears
      return;
    }
    var value = Number(message.value);
    if (message.type === "quality") {
      if (jwApi && Number.isInteger(value) && value >= 0 && value < (jwApi.getQualityLevels() || []).length) jwApi.setCurrentQuality(value);
      return;
    }
    if (!video) return;

    if (message.type === "play") { var playing = video.play(); if (playing && playing.catch) playing.catch(function () {}); }
    else if (message.type === "pause") video.pause();
    else if (message.type === "seek" && isFinite(value)) video.currentTime = Math.max(0, Math.min(value, video.duration || value));
    else if (message.type === "rate" && value > 0 && value <= 4) video.playbackRate = value;
    else if (message.type === "volume" && value >= 0 && value <= 1) { video.volume = value; video.muted = value === 0; }
  });

  // Tell the app the bridge is here; repeated because the app may attach its listener after us
  send("present");
  document.addEventListener("DOMContentLoaded", function () { send("present"); });
  window.addEventListener("load", function () { send("present"); });
})();
