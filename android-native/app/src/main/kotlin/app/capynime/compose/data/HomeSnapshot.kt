package app.capynime.compose.data

/**
 * The home page as the last session read it ([Source.page] keeps it in Source.homeSnapshot): shown on launch
 * while the fresh one loads, and when the network is down, like the web keeps its query cache in IndexedDB.
 * Read and parsed once, off the main thread (rememberLoad's `stale`); a copy older than a week is not shown.
 */
object HomeSnapshot {
    private const val MAX_AGE_MS = 7L * 24 * 3600_000

    private val html: String? by lazy {
        runCatching {
            Source.homeSnapshot.takeIf { it.isFile && System.currentTimeMillis() - it.lastModified() < MAX_AGE_MS }?.readText()
        }.getOrNull()
    }

    fun home(): HomeData? = html?.let { runCatching { Parsers.home(it) }.getOrNull() }

    fun menu(): List<MenuGroup>? = html?.let { runCatching { Parsers.menu(it) }.getOrNull()?.takeIf { m -> m.isNotEmpty() } }
}
