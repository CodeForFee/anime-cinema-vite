package app.capynime.compose.data

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.json.JSONArray
import org.json.JSONObject

/** A title in history: where the viewer left off */
data class HistoryEntry(
    val slug: String,
    val title: String,
    val poster: String,
    val episodeId: String,
    val episodeName: String,
    val updatedAt: Long,
)

/** CapyCinema choices (web: features/player/store.ts), kept for every episode */
data class PlayerPrefs(
    val upscale: String = "off", // off | fsr | anime4k
    val color: Boolean = false,
    val surround: Boolean = false,
    val surroundMode: String = "headphones", // headphones | speakers
    val autoNext: Boolean = true,
)

/**
 * What the device keeps (web: core/stores/history.ts, core/player/progress.ts, features/player/store.ts and the
 * signed-in user of features/account/store.ts): JSON in SharedPreferences, read once, observed as flows.
 */
object Library {
    private lateinit var prefs: SharedPreferences

    private val _favorites = MutableStateFlow<List<AnimeItem>>(emptyList())
    val favorites: StateFlow<List<AnimeItem>> = _favorites.asStateFlow()
    private val _history = MutableStateFlow<List<HistoryEntry>>(emptyList())
    val history: StateFlow<List<HistoryEntry>> = _history.asStateFlow()
    private val _player = MutableStateFlow(PlayerPrefs())
    val player: StateFlow<PlayerPrefs> = _player.asStateFlow()
    private val _user = MutableStateFlow<SourceUser?>(null)
    val user: StateFlow<SourceUser?> = _user.asStateFlow()

    fun init(context: Context) {
        prefs = context.getSharedPreferences("library", Context.MODE_PRIVATE)
        _favorites.value = readArray("favorites").mapNotNull { runCatching { itemFrom(it) }.getOrNull() }
        _history.value = readArray("history").mapNotNull {
            runCatching {
                HistoryEntry(it.getString("slug"), it.getString("title"), it.optString("poster"), it.optString("episodeId"), it.optString("episodeName"), it.optLong("updatedAt"))
            }.getOrNull()
        }
        prefs.getString("player", null)?.let { s ->
            runCatching {
                val o = JSONObject(s)
                _player.value = PlayerPrefs(o.optString("upscale", "off"), o.optBoolean("color"), o.optBoolean("surround"), o.optString("surroundMode", "headphones"), o.optBoolean("autoNext", true))
            }
        }
        prefs.getString("user", null)?.let { s ->
            runCatching { val o = JSONObject(s); _user.value = SourceUser(o.optInt("id"), o.optString("name"), o.optString("avatar")) }
        }
    }

    private fun readArray(key: String): List<JSONObject> = runCatching {
        val a = JSONArray(prefs.getString(key, "[]"))
        (0 until a.length()).map { a.getJSONObject(it) }
    }.getOrDefault(emptyList())

    private fun writeArray(key: String, items: List<JSONObject>) {
        val a = JSONArray()
        items.forEach { a.put(it) }
        prefs.edit().putString(key, a.toString()).apply()
    }

    private fun itemJson(i: AnimeItem) = JSONObject().put("slug", i.slug).put("title", i.title).put("poster", i.poster)
        .put("year", i.year ?: JSONObject.NULL).put("rating", i.rating ?: JSONObject.NULL).put("episode", i.episode)

    private fun itemFrom(o: JSONObject) = AnimeItem(
        slug = o.getString("slug"), title = o.getString("title"), poster = o.optString("poster"),
        year = if (o.isNull("year")) null else o.optInt("year"),
        rating = if (o.isNull("rating")) null else o.optDouble("rating"), episode = o.optString("episode"),
    )

    // ---- favorites ("Danh sách của tôi" / "Hộp phim") ----
    fun isFavorite(slug: String) = _favorites.value.any { it.slug == slug }

    fun toggleFavorite(item: AnimeItem) {
        val next = if (isFavorite(item.slug)) _favorites.value.filterNot { it.slug == item.slug } else listOf(item) + _favorites.value
        _favorites.value = next
        writeArray("favorites", next.map(::itemJson))
    }

    // ---- history ----
    fun historyOf(slug: String) = _history.value.firstOrNull { it.slug == slug }

    fun addHistory(entry: HistoryEntry) {
        val next = (listOf(entry) + _history.value.filterNot { it.slug == entry.slug }).take(300)
        _history.value = next
        writeArray(
            "history",
            next.map {
                JSONObject().put("slug", it.slug).put("title", it.title).put("poster", it.poster).put("episodeId", it.episodeId)
                    .put("episodeName", it.episodeName).put("updatedAt", it.updatedAt)
            },
        )
    }

    fun removeHistory(slug: String) {
        _history.value = _history.value.filterNot { it.slug == slug }
        writeArray("history", readArray("history").filterNot { it.optString("slug") == slug })
    }

    fun clearHistory() {
        _history.value = emptyList()
        writeArray("history", emptyList())
    }

    // ---- watch position per episode (core/player/progress.ts) ----
    private fun progressKey(slug: String, episodeId: String) = "p:$slug:$episodeId"

    fun saveProgress(slug: String, episodeId: String, seconds: Double, duration: Double) {
        if (duration <= 0) return
        prefs.edit().putString(progressKey(slug, episodeId), "$seconds/$duration").apply()
    }

    /** (seconds, duration) */
    fun progress(slug: String, episodeId: String): Pair<Double, Double>? = prefs.getString(progressKey(slug, episodeId), null)
        ?.split('/')?.takeIf { it.size == 2 }?.let { (t, d) -> (t.toDoubleOrNull() ?: 0.0) to (d.toDoubleOrNull() ?: 0.0) }

    /** Where to resume: past the first 10 s and not within the last 5 % (progress.ts resumePoint) */
    fun resumePoint(slug: String, episodeId: String): Double? {
        val (t, d) = progress(slug, episodeId) ?: return null
        return t.takeIf { it > 10 && d > 0 && it < d * 0.95 }
    }

    // ---- player choices ----
    fun setPlayer(next: PlayerPrefs) {
        _player.value = next
        prefs.edit().putString(
            "player",
            JSONObject().put("upscale", next.upscale).put("color", next.color).put("surround", next.surround)
                .put("surroundMode", next.surroundMode).put("autoNext", next.autoNext).toString(),
        ).apply()
    }

    // ---- signed-in user ----
    fun setUser(user: SourceUser?) {
        if (_user.value?.id != user?.id) {
            app.capynime.compose.ui.common.MemoryCache.drop("account")
            app.capynime.compose.ui.common.MemoryCache.drop("notifications")
            app.capynime.compose.ui.common.MemoryCache.drop("my-comments")
        }
        _user.value = user
        prefs.edit().putString("user", user?.let { JSONObject().put("id", it.id).put("name", it.name).put("avatar", it.avatar).toString() }).apply()
    }
}
