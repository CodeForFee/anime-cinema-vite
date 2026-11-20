package app.capynime.compose.player

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Color
import android.net.Uri
import android.view.View
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import app.capynime.compose.data.PlayerPrefs
import app.capynime.compose.data.SourceHosts
import app.capynime.compose.data.Stream
import org.json.JSONObject
import java.io.ByteArrayInputStream

/** What the player frame reports (iframe-bridge.ts PlayerState) */
@Immutable
data class PlayerState(
    val currentTime: Double = 0.0,
    val duration: Double = 0.0,
    val paused: Boolean = true,
    val waiting: Boolean = false,
    val rate: Double = 1.0,
    val ended: Boolean = false,
    val ahead: Double = 0.0,
)

@Immutable
data class QualityLevel(val index: Int, val label: String, val height: Int)

/** What the frame's enhancers run (engines/enhance EnhanceState) */
@Immutable
data class Enhanced(
    val upscale: String,
    val color: Boolean,
    val surround: Boolean,
    val webgl2: Boolean,
    val webgpu: Boolean,
    val audio: Boolean,
    val error: String?,
    val notice: String?,
)

/** Native Media3 playback, with the original source player retained for source-only formats and effects. */
class PlayerController(private val context: Context) {
    var ready by mutableStateOf(false)
        private set
    var state by mutableStateOf<PlayerState?>(null)
        private set
    var levels by mutableStateOf<List<QualityLevel>>(emptyList())
        private set
    var currentLevel by mutableStateOf(-1)
        private set
    var visualLabel by mutableStateOf("")
        private set
    var enhanced by mutableStateOf<Enhanced?>(null)
        private set
    /** The position the player's own (hidden) resume box offers */
    var resumeOffer by mutableStateOf<Double?>(null)
    var loaded by mutableStateOf(false)
        private set
    var nativePlayback by mutableStateOf(false)
        private set
    var playbackError by mutableStateOf<String?>(null)
        private set
    var compatibilityReason by mutableStateOf<String?>(null)
        private set
    var hasStream by mutableStateOf(false)
        private set
    val hasSourcePlayer: Boolean get() = activeStream is Stream.Embed
    val surface: View get() = if (nativePlayback) requireNotNull(native).view else webView

    private var native: NativePlayback? = null
    private var activeStream: Stream? = null
    private var destroyed = false
    private var foreground = true
    @Volatile private var generation = 0
    @Volatile private var allowNativeCapture = false
    private var restoreInBrowser: PlayerState? = null
    private val watchdog = android.os.Handler(android.os.Looper.getMainLooper())

    // Direct streams never allocate a WebView; browsing allocates neither video engine.
    private val browser = lazy { createBrowser() }
    val webView: WebView get() = browser.value

    @SuppressLint("SetJavaScriptEnabled")
    private fun createBrowser(): WebView = WebView(context).apply {
        setBackgroundColor(Color.BLACK)
        isVerticalScrollBarEnabled = false
        isHorizontalScrollBarEnabled = false
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.setSupportMultipleWindows(false) // the player's pop-ups open nowhere
        settings.javaScriptCanOpenWindowsAutomatically = false
        // The player frame (googleapiscdn) is third-party to the host page: WebView blocks its cookies by default,
        // and the source player's session/Cloudflare cookies then never stick, so some episodes never start.
        android.webkit.CookieManager.getInstance().setAcceptThirdPartyCookies(this, true)
        // the frame's console in logcat (tag CapyPlayer): what the bridge and the enhancers report
        webChromeClient = object : android.webkit.WebChromeClient() {
            override fun onConsoleMessage(m: android.webkit.ConsoleMessage): Boolean {
                // the source player logs every second: only errors are worth keeping
                if (m.messageLevel() == android.webkit.ConsoleMessage.MessageLevel.ERROR) android.util.Log.d("CapyPlayer", m.message().take(300))
                return true
            }
        }
        webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
                val url = request.url.toString()
                if (AD_URL_PARTS.any { it in url }) return WebResourceResponse("text/plain", "utf-8", ByteArrayInputStream(ByteArray(0)))
                if (allowNativeCapture && PlaybackPolicy.isDiscoverableHls(url)) {
                    val at = generation
                    val referer = request.requestHeaders.entries.firstOrNull { it.key.equals("Referer", true) }?.value
                    view.post {
                        val stream = activeStream as? Stream.Embed
                        if (!destroyed && this@PlayerController.foreground && generation == at && allowNativeCapture && stream != null && !nativePlayback && PlaybackPolicy.isFrameRequest(referer, stream.url)) {
                            allowNativeCapture = false // one native attempt per episode; a failure falls back without looping
                            startNative(url, PlaybackPolicy.mediaHeaders(SourceHosts.origin, referer ?: stream.url), state)
                        }
                    }
                }
                return null
            }

            // the host page never navigates; a frame trying to send the top page to an ad is refused
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest) = request.isForMainFrame

            override fun onPageFinished(view: WebView, url: String?) {
                if (!nativePlayback && !destroyed) loaded = true
            }
        }
        val assets = context.assets
        fun read(name: String) = runCatching { assets.open(name).bufferedReader().use { it.readText() } }.getOrNull()
        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            val bridge = read("player-bridge.js")
            val enhance = read("player-enhance.js")
            if (bridge != null)
                WebViewCompat.addDocumentStartJavaScript(this, (enhance?.let { "$it\n;" } ?: "") + bridge +
                    (if (NATIVE_PROMOTION) "\n;" + NativeMediaProbe.script else ""), setOf(PLAYER_ORIGIN))
        }
        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            WebViewCompat.addWebMessageListener(this, "CapyHost", setOf(SourceHosts.origin)) { _, message, _, mainFrame, _ ->
                if (mainFrame && !nativePlayback && !destroyed) message.data?.let(::onBridgeMessage)
            }
        }
    }

    /** Direct media uses Media3; an embed may reveal an HLS manifest during its normal source bootstrap. */
    fun load(stream: Stream) {
        check(!destroyed) { "Trình phát đã đóng" }
        PlaybackPolicy.httpsUrl(when (stream) { is Stream.Embed -> stream.url; is Stream.File -> stream.url })
        generation++
        activeStream = stream
        hasStream = true
        native?.release()
        native = null
        if (browser.isInitialized()) {
            webView.stopLoading()
            webView.loadUrl("about:blank")
        }
        nativePlayback = false
        ready = false
        state = null
        levels = emptyList()
        currentLevel = -1
        enhanced = null
        resumeOffer = null
        loaded = false
        playbackError = null
        compatibilityReason = null
        restoreInBrowser = null
        allowNativeCapture = NATIVE_PROMOTION && stream is Stream.Embed && !sourceEffectsRequested()
        when (stream) {
            is Stream.File -> startNative(stream.url, PlaybackPolicy.mediaHeaders(SourceHosts.origin), null)
            is Stream.Embed -> loadBrowser(stream)
        }
    }

    private fun startNative(url: String, headers: Map<String, String>, previous: PlayerState?, hls: Boolean = false) {
        if (destroyed) return
        val at = generation
        nativePlayback = true
        android.util.Log.i("CapyPlayer", "Native playback selected")
        ready = false
        loaded = false
        playbackError = null
        levels = emptyList()
        currentLevel = -1
        enhanced = Enhanced("off", false, false, false, false, false, null, null)
        if (browser.isInitialized()) {
            // Stopping the document releases its video decoder, so two engines never play together.
            webView.stopLoading()
            webView.loadUrl("about:blank")
            webView.onPause()
        }
        native?.release()
        // Watchdog: a captured stream that neither plays nor errors (a stalled CDN, a segment the source player
        // transforms itself) must not leave a spinner forever: hand the episode back to the source player.
        watchdog.removeCallbacksAndMessages(null)
        watchdog.postDelayed({
            if (!destroyed && nativePlayback && generation == at && !ready && foreground) native?.fail()
        }, NATIVE_START_TIMEOUT_MS)
        native = NativePlayback(context,
            onState = { snapshot, prepared, label ->
                if (!destroyed && nativePlayback && generation == at) {
                    state = snapshot
                    ready = ready || prepared
                    loaded = loaded || prepared
                    visualLabel = label
                }
            },
            onQualities = { choices -> if (nativePlayback && generation == at) levels = choices },
            onFailure = {
                if (!destroyed && nativePlayback && generation == at) {
                    if (activeStream is Stream.Embed) {
                        compatibilityReason = "Nguồn này cần player tương thích; ứng dụng đã tự chuyển lại."
                        useSourcePlayer()
                    } else {
                        playbackError = "Không phát được video. Kiểm tra kết nối hoặc tải lại tập."
                        loaded = true
                    }
                }
            },
        ).also { engine ->
            engine.load(url, headers, previous?.currentTime ?: 0.0, previous?.rate ?: 1.0, previous?.paused ?: false, hls)
            if (!foreground) engine.onPause()
        }
    }

    private fun loadBrowser(stream: Stream) {
        webView.onResume()
        val body = when (stream) {
            is Stream.Embed -> """<iframe id="f" src="${escape(stream.url)}#animevsub-vsub_extra" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen></iframe>
<script>
var f = document.getElementById('f'), origin = new URL(f.src).origin;
window.addEventListener('message', function (e) {
  if (e.source !== f.contentWindow || e.origin !== origin || !e.data || e.data.source !== 'avs-player-bridge') return;
  try { CapyHost.postMessage(JSON.stringify(Object.assign({}, e.data, { nativeGeneration: $generation }))); } catch (x) {}
});
window.__send = function (type, value) { f.contentWindow.postMessage({ source: 'avs-player-app', type: type, value: value }, origin); };
</script>"""
            is Stream.File -> """<video src="${escape(stream.url)}" controls autoplay playsinline></video>"""
        }
        val html = """<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}iframe,video{position:fixed;inset:0;width:100%;height:100%;border:0;background:#000}</style>
</head><body>$body</body></html>"""
        webView.loadDataWithBaseURL("${SourceHosts.origin}/", html, "text/html", "utf-8", null)
    }

    /** Source WebGL/WebGPU/audio effects remain available explicitly instead of being labelled native effects. */
    fun useSourcePlayer() {
        val stream = activeStream as? Stream.Embed ?: return
        restoreInBrowser = state
        allowNativeCapture = false
        native?.release()
        native = null
        nativePlayback = false
        ready = false
        loaded = false
        levels = emptyList()
        currentLevel = -1
        enhanced = null
        loadBrowser(stream)
    }

    fun retry() { activeStream?.let(::load) }

    private fun sourceEffectsRequested() = lastEnhance?.let {
        it.optString("upscale", "off") != "off" || it.optBoolean("color") || it.optBoolean("surround")
    } == true

    private fun escape(url: String) = url.replace("&", "&amp;").replace("\"", "&quot;").replace("<", "&lt;")

    private fun onBridgeMessage(raw: String) {
        val m = runCatching { JSONObject(raw) }.getOrNull() ?: return
        if (m.optString("type") == "enhanced") android.util.Log.d("CapyPlayer", "<- ${raw.take(300)}")
        when (m.optString("type")) {
            "native-media" -> {
                val stream = activeStream as? Stream.Embed ?: return
                if (!allowNativeCapture || nativePlayback || !foreground || m.optInt("nativeGeneration", -1) != generation) return
                val offer = PlaybackPolicy.mediaOffer(m.optString("url"), m.optString("mediaType"), m.optString("frameUrl"), stream.url, m.optBoolean("drm")) ?: return
                allowNativeCapture = false
                startNative(offer.url, PlaybackPolicy.mediaHeaders(SourceHosts.origin, stream.url), state, offer.hls)
            }
            "present" -> send("hello")
            "ready" -> {
                ready = true
                // the player page reloads itself now and then, and a new frame starts without the choices: send them again
                lastEnhance?.let { send("enhance", it) }
                if (restoreInBrowser != null) send("pause")
            }
            "state" -> {
                state = PlayerState(
                currentTime = m.optDouble("currentTime", 0.0),
                duration = m.optDouble("duration", 0.0),
                paused = m.optBoolean("paused", true),
                waiting = m.optBoolean("waiting"),
                rate = m.optDouble("rate", 1.0),
                ended = m.optBoolean("ended"),
                ahead = m.optDouble("ahead", 0.0),
                )
                if ((state?.duration ?: 0.0) > 0) restoreInBrowser?.let {
                    send("seek", it.currentTime)
                    send("rate", it.rate)
                    send(if (it.paused) "pause" else "play")
                    restoreInBrowser = null
                }
            }
            "resume" -> m.optDouble("at", 0.0).takeIf { it > 0 }?.let { resumeOffer = it }
            "levels" -> {
                val list = m.optJSONArray("levels")
                levels = (0 until (list?.length() ?: 0)).map { i ->
                    val l = list!!.getJSONObject(i)
                    QualityLevel(l.optInt("index", i), l.optString("label"), l.optInt("height"))
                }
                currentLevel = m.optInt("current", -1)
            }
            "visual" -> visualLabel = m.optInt("height").takeIf { it > 0 }?.let { "${it}p" } ?: m.optString("label")
            "enhanced" -> {
                val support = m.optJSONObject("support")
                enhanced = Enhanced(
                    upscale = m.optString("upscale", "off"),
                    color = m.optBoolean("color"),
                    surround = m.optBoolean("surround"),
                    webgl2 = support?.optBoolean("webgl2") == true,
                    webgpu = support?.optBoolean("webgpu") == true,
                    audio = support?.optBoolean("audio") == true,
                    error = m.optString("error").takeIf { it.isNotEmpty() && it != "null" }?.take(200),
                    notice = m.optString("notice").takeIf { it == "downgraded" || it == "stopped" },
                )
            }
        }
    }

    /** One command to the bridge: play, pause, seek, rate, volume, resume, quality, hello */
    fun send(type: String, value: Any? = null) {
        if (destroyed) return
        if (nativePlayback) {
            val engine = native ?: return
            val number = value as? Number
            when (type) {
                "play" -> engine.play()
                "pause" -> engine.pause()
                "seek" -> number?.let { engine.seek(it.toDouble()) }
                "rate" -> number?.let { engine.rate(it.toDouble()) }
                "volume" -> number?.let { engine.volume(it.toDouble()) }
                "quality" -> number?.let { quality(it.toInt()) }
            }
            return
        }
        if (!browser.isInitialized()) return
        val v = when (value) {
            null -> "undefined"
            is Number -> value.toString()
            is JSONObject -> value.toString()
            else -> JSONObject.quote(value.toString())
        }
        if (type == "enhance") android.util.Log.d("CapyPlayer", "-> $type $v")
        webView.post { webView.evaluateJavascript("window.__send && window.__send(${JSONObject.quote(type)}, $v)", null) }
    }

    fun play() = send("play")
    fun pause() = send("pause")
    fun seek(seconds: Double) = send("seek", PlaybackPolicy.seekMillis(seconds, ((state?.duration ?: 0.0) * 1000).toLong()) / 1000.0)
    fun rate(rate: Double) = send("rate", PlaybackPolicy.playbackRate(rate).toDouble())
    fun quality(index: Int) {
        if (nativePlayback) {
            if (index != -1 && levels.none { it.index == index }) return
            native?.quality(index)
            currentLevel = index
        } else send("quality", index)
    }

    /** CapyCinema choices for the frame's engines/enhance (same message as the web's sendEnhance) */
    /** The last CapyCinema choices, re-sent to every new frame */
    private var lastEnhance: JSONObject? = null

    fun enhance(prefs: PlayerPrefs, lite: Boolean) {
        val value = JSONObject().put("surround", prefs.surround).put("surroundMode", prefs.surroundMode).put("upscale", prefs.upscale)
            .put("color", prefs.color).put("lite", lite).put("mobile", true)
        lastEnhance = value
        if (nativePlayback && sourceEffectsRequested() && hasSourcePlayer) useSourcePlayer()
        if (!nativePlayback) send("enhance", value)
    }

    fun onPause() {
        foreground = false
        native?.onPause()
        if (browser.isInitialized()) webView.onPause()
    }
    fun onResume() {
        foreground = true
        native?.onResume()
        if (!nativePlayback && browser.isInitialized()) webView.onResume()
    }

    fun destroy() {
        if (destroyed) return
        destroyed = true
        watchdog.removeCallbacksAndMessages(null)
        allowNativeCapture = false
        native?.release()
        native = null
        if (browser.isInitialized()) {
            webView.stopLoading()
            webView.loadUrl("about:blank")
            webView.destroy()
        }
    }

    companion object {
        /** The only frames the bridge goes into (MainActivity.java PLAYER_ORIGIN) */
        const val PLAYER_ORIGIN = "https://*.googleapiscdn.com"
        private const val NATIVE_START_TIMEOUT_MS = 15_000L
        // ponytail: off. On the emulator (2026-11-20) the HLS the source player loads never reached READY in Media3
        // (no error, 15 s stall), then the episode reloaded in the source player: every episode started ~16 s late.
        // The source player plays the same stream at once, as the Capacitor app does. Turn on again only after a
        // captured stream is proven to reach READY on device.
        private const val NATIVE_PROMOTION = false

        /** Ad requests answered empty (MainActivity.java AD_URL_PARTS, the extension's ad-rules.ts) */
        val AD_URL_PARTS = listOf("adqc.net", "popads.net", "adsterra.com", "propellerads.com", "/static/jwplayer/vast.js", "/admin/api/ads/active")

        fun host(url: String): String? = runCatching { Uri.parse(url).host }.getOrNull()
    }
}
