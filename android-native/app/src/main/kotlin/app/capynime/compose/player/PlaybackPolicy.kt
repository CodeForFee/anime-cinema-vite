package app.capynime.compose.player

import java.net.URI

/** Validation shared by direct links and the source player's discovered media requests. */
internal object PlaybackPolicy {
    data class MediaOffer(val url: String, val hls: Boolean)

    fun httpsUrl(raw: String): String {
        require(raw.none { it == '\r' || it == '\n' }) { "Liên kết phát không hợp lệ" }
        val url = if (raw.startsWith("//")) "https:$raw" else raw
        val uri = runCatching { URI(url) }.getOrNull()
        require(uri != null && uri.scheme.equals("https", true) && !uri.host.isNullOrBlank() && uri.userInfo == null) {
            "Chỉ hỗ trợ liên kết phát HTTPS an toàn"
        }
        return uri.toASCIIString()
    }

    fun isDiscoverableHls(raw: String): Boolean = runCatching {
        URI(httpsUrl(raw)).path.lowercase().endsWith(".m3u8")
    }.getOrDefault(false)

    fun isFrameRequest(referer: String?, frameUrl: String): Boolean = runCatching {
        if (referer == null) return false
        val source = URI(httpsUrl(referer))
        val frame = URI(httpsUrl(frameUrl))
        source.host.equals(frame.host, true) && source.port == frame.port
    }.getOrDefault(false)

    /** An offer must belong to this exact episode document, not another iframe or a stale navigation. */
    fun mediaOffer(url: String, type: String, frameUrl: String, expectedFrameUrl: String, drm: Boolean): MediaOffer? = runCatching {
        if (drm || url.length > 32_768) return null
        val document = URI(httpsUrl(frameUrl).substringBefore('#'))
        val expected = URI(httpsUrl(expectedFrameUrl).substringBefore('#'))
        if (document != expected) return null
        val safe = httpsUrl(url)
        val normalized = type.lowercase()
        val hls = normalized == "hls" || normalized in setOf("application/x-mpegurl", "application/vnd.apple.mpegurl") || isDiscoverableHls(safe)
        val mp4 = normalized == "mp4" || normalized == "video/mp4" || URI(safe).path.lowercase().endsWith(".mp4")
        if (!hls && !mp4) return null
        MediaOffer(safe, hls)
    }.getOrNull()

    /** No Cookie, Authorization or source-private headers are copied to a different media host. */
    fun mediaHeaders(sourceOrigin: String, frameUrl: String? = null): Map<String, String> {
        val referer = frameUrl?.let { runCatching { httpsUrl(it) }.getOrNull() }
            ?: httpsUrl(sourceOrigin.trimEnd('/') + "/")
        val uri = URI(referer)
        val origin = "${uri.scheme}://${uri.rawAuthority}"
        return mapOf("Referer" to referer.substringBefore('#'), "Origin" to origin)
    }

    fun seekMillis(seconds: Double, durationMillis: Long = 0): Long {
        if (!seconds.isFinite()) return 0
        val position = (seconds.coerceAtLeast(0.0) * 1000.0).coerceAtMost(Long.MAX_VALUE.toDouble()).toLong()
        return if (durationMillis > 0) position.coerceAtMost(durationMillis) else position
    }

    fun playbackRate(rate: Double): Float = if (rate.isFinite()) rate.coerceIn(0.25, 3.0).toFloat() else 1f
}
