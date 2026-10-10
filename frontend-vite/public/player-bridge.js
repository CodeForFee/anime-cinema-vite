/**
 * Runs inside the source's player page (storage.googleapiscdn.com/player/...), in the page's own JS
 * world, at document start. Injected by the Android app (MainActivity.java) and by the AVS Helper
 * extension (manifest content script). It only acts when the page was embedded by this app, which
 * tags the frame URL with "#animevsub-vsub"; anywhere else it does nothing.
 *
 *  1. Ad shield. Same rules as animevietsub-adshield-extension (injected.js) and the cleanup
 *     backend-hono used to inject into the player page (avs-adshield-css / avs-adshield-js).
 *     Ad requests themselves are blocked at the network layer (MainActivity / extension rules).
 *  2. Remote control. Lets src/hooks/usePlayerBridge.ts drive the <video> by postMessage, so the app
 *     can draw its own touch controls. The player's controls are hidden only after the app says hello.
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

  function purgeAds() {
    try {
      document.querySelectorAll("div, a, img, iframe, span, button, p, marquee").forEach(function (el) {
        if (el.closest(".jwplayer") || el.tagName === "VIDEO") return;
        var text = (el.innerText || el.textContent || "").trim().toLowerCase();
        var href = (el.getAttribute("href") || "").toLowerCase();
        var src = (el.getAttribute("src") || "").toLowerCase();
        var id = (el.id || "").toLowerCase();
        var cls = (el.className || "").toString().toLowerCase();
        if (text.includes("đóng và xem") || text.includes("bom88") || text.includes("truy cập bit.ly") ||
          href.includes("bit.ly") || href.includes("bom88") || src.includes("bom88") ||
          id.includes("banner-overlay") || cls.includes("pause-ad") || cls.includes("jw-banner")) {
          el.remove();
        }
      });
    } catch (e) { /* the page is still loading */ }
  }
  setInterval(function () {
    addStyle("avs-adshield-css", AD_CSS); // the page may replace <head>
    purgeAds();
  }, 500);

  /* ---------- 2. Remote control ---------- */

  var BRIDGE = "avs-player-bridge";
  var APP = "avs-player-app";
  var controlled = false;
  var video = null;

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
      ended: video.ended
    });
  }

  function attach() {
    var found = document.querySelector("video.jw-video") || document.querySelector("video");
    if (!found || found === video) return;
    video = found;
    ["play", "playing", "pause", "waiting", "seeked", "ratechange", "durationchange", "ended", "timeupdate"]
      .forEach(function (name) { video.addEventListener(name, report); });
    report();
  }

  window.addEventListener("message", function (event) {
    var message = event.data;
    if (event.source !== window.parent || !message || message.source !== APP) return;

    if (message.type === "hello") {
      if (!controlled) {
        controlled = true;
        setInterval(function () { addStyle("avs-controls-css", CONTROLS_CSS); attach(); }, 500);
      }
      addStyle("avs-controls-css", CONTROLS_CSS);
      attach();
      send("ready");
      report();
      return;
    }
    if (!controlled || !video) return;

    var value = Number(message.value);
    if (message.type === "play") { var playing = video.play(); if (playing && playing.catch) playing.catch(function () {}); }
    else if (message.type === "pause") video.pause();
    else if (message.type === "seek" && isFinite(value)) video.currentTime = Math.max(0, Math.min(value, video.duration || value));
    else if (message.type === "rate" && value > 0 && value <= 4) video.playbackRate = value;
  });

  // Tell the app the bridge is here; repeated because the app may attach its listener after us
  send("present");
  document.addEventListener("DOMContentLoaded", function () { send("present"); });
  window.addEventListener("load", function () { send("present"); });
})();
