package app.capynime.compose.data

import android.content.Context
import android.content.SharedPreferences
import java.net.URI

/**
 * The source's domains (port of src/core/source/hosts.ts + hosts.json of the web app): the current one first,
 * then the known alternates that redirect to it. The working host is remembered across launches; when it stops
 * answering, [Source] finds the next one through the official short link and adopts it.
 */
object SourceHosts {
    const val OFFICIAL_LINK = "https://bit.ly/animevietsubtv"

    // hosts.json (checked 2026-10-23) + .bid, where the alternates redirect since 2026-11 (curl 2026-11-20)
    val INVENTORY: List<String> = listOf(
        "animevietsub.bid", "animevietsub.sale",
        "animevietsub.link", "animevietsub.fan", "animevietsub.vip", "animevietsub.bio", "animevietsub.me",
        "animevietsub.moe", "animevietsub.now", "animevietsub.cam", "animevietsub.xyz", "animevietsub.info",
        "animevietsub.in", "animevietsub.us",
        "animevietsub.site", "animevietsub.tv", "animevietsub.app", "animevietsub.cc",
    )

    /** Sites named the same way that are not the source */
    private val LOOKALIKES = setOf(
        "animevietsub.global", "animevietsub.wtf", "animevietsub.gg", "animevietsub.ac", "animevietsub.fm",
        "animevietsub.stream", "animevietsub.co", "animevietsub.ws", "animevietsub.to", "animevietsub.mobi",
        "animevietsub.life", "animevietsub.biz", "animevietsub.red", "animevietsub.asia", "animevietsub.run",
        "animevietsub.blog", "animevietsub.click", "animevietsub.ru", "animevietsub.pw", "animevietsub.dev",
        "animevietsub.one", "animevietsub.lol", "animevietsub.show",
    )

    private val HOST_RE = Regex("^animevietsub\\.[a-z.]+$", RegexOption.IGNORE_CASE)
    private const val KEY = "source-host"
    private var prefs: SharedPreferences? = null

    @Volatile
    var host: String = INVENTORY.first()
        private set

    val origin: String get() = "https://$host"

    fun init(context: Context) {
        prefs = context.getSharedPreferences("source", Context.MODE_PRIVATE)
        prefs?.getString(KEY, null)?.takeIf(::isSourceHost)?.let { host = it }
    }

    fun isSourceHost(host: String?): Boolean =
        host != null && HOST_RE.matches(host) && host.lowercase() !in LOOKALIKES

    /** An image or page on the source's CDN (cdn.animevietsub.*) or the source itself */
    fun isSourceFamily(host: String?): Boolean =
        host != null && (isSourceHost(host) || Regex("(^|\\.)animevietsub\\.[a-z]+$").containsMatchIn(host))

    fun adopt(next: String) {
        if (!isSourceHost(next) || next == host) return
        host = next
        prefs?.edit()?.putString(KEY, next)?.apply()
    }

    /** The host of a https source URL, or null when the URL is anything else */
    fun sourceHostOf(url: String): String? = runCatching {
        val uri = URI(url)
        uri.host?.takeIf { uri.scheme == "https" && uri.port == -1 && uri.userInfo == null && isSourceHost(it) }
    }.getOrNull()

    /** Old-domain and http:// image links of the source, on the current host over https */
    fun fixUrl(url: String?): String {
        if (url.isNullOrBlank()) return ""
        var u = if (url.startsWith("//")) "https:$url" else url
        if (u.startsWith("http://")) u = "https://" + u.removePrefix("http://")
        return runCatching {
            val uri = URI(u)
            if (isSourceHost(uri.host)) URI(uri.scheme, uri.userInfo, host, uri.port, uri.path, uri.query, null).toString()
            else u.substringBefore('#')
        }.getOrDefault(u)
    }
}
