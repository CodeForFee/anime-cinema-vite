package app.capynime.compose.player

/** Reads only the source player's public playlist API; no fetch interception, decryption or private config. */
internal object NativeMediaProbe {
    val script = """
        (function () {
          if (window.top === window || !/animevsub-vsub/.test(location.hash) || window.__capyNativeProbe) return;
          window.__capyNativeProbe = true;
          var attempts = 0, sent = false, timer;
          function protectedSource(value) {
            if (!value) return false;
            if (typeof value !== 'object') return true;
            return Object.keys(value).length > 0;
          }
          function check() {
            if (sent || ++attempts > 120) { clearInterval(timer); return; }
            try {
              if (typeof window.jwplayer !== 'function') return;
              var api = window.jwplayer();
              if (!api || typeof api.getPlaylistItem !== 'function') return;
              var item = api.getPlaylistItem();
              if (!item || protectedSource(item.drm)) return;
              var choices = Array.isArray(item.sources) ? item.sources.slice() : [];
              if (item.file) choices.push(item);
              for (var i = 0; i < choices.length; i++) {
                var candidate = choices[i];
                if (!candidate || !candidate.file || protectedSource(candidate.drm)) continue;
                var url = new URL(String(candidate.file), location.href);
                if (url.protocol !== 'https:' || url.username || url.password) continue;
                var type = String(candidate.type || item.type || '').toLowerCase();
                var hls = type === 'hls' || type.indexOf('mpegurl') !== -1 || /\.m3u8$/i.test(url.pathname);
                var mp4 = type === 'mp4' || type === 'video/mp4' || /\.mp4$/i.test(url.pathname);
                if (!hls && !mp4) continue;
                window.parent.postMessage({ source: 'avs-player-bridge', type: 'native-media',
                  url: url.href, mediaType: hls ? 'hls' : 'mp4', frameUrl: location.href, drm: false }, '*');
                sent = true;
                clearInterval(timer);
                return;
              }
            } catch (error) { /* not ready or unsupported: the original source player remains in charge */ }
          }
          timer = setInterval(check, 500);
          window.addEventListener('pagehide', function () { clearInterval(timer); });
          check();
        })();
    """.trimIndent()
}
