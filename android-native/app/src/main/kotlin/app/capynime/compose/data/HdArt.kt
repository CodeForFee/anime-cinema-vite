package app.capynime.compose.data

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.sync.withPermit
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.text.Normalizer
import java.util.concurrent.ConcurrentHashMap

/**
 * Port of core/hd-art.ts: the source only has ~283x400 posters, AniList has the same covers at 460x650 (and
 * banners). Each title is looked up once by its names and year, in batches; the answer, hit or miss, is kept on
 * the device. Only an exact title match is taken: a wrong poster is worse than a soft one.
 */
object HdArt {
    data class Art(val cover: String?, val banner: String?, val at: Long)

    private const val RETRY_MISS_MS = 7L * 24 * 60 * 60 * 1000
    private const val BATCH = 16
    private const val GAP_MS = 2100L
    private const val FIELDS = "title{romaji english native} synonyms seasonYear startDate{year} coverImage{extraLarge} bannerImage"

    private lateinit var prefs: SharedPreferences
    private val known = ConcurrentHashMap<String, MutableStateFlow<Art?>>()
    private val inFlight = ConcurrentHashMap.newKeySet<String>()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val http = OkHttpClient()

    fun init(context: Context) {
        prefs = context.getSharedPreferences("hdart", Context.MODE_PRIVATE)
        for ((key, raw) in prefs.all) runCatching {
            val o = JSONObject(raw as String)
            flow(key).value = Art(o.optString("c").ifEmpty { null }, o.optString("b").ifEmpty { null }, o.optLong("at"))
        }
    }

    fun flow(key: String): MutableStateFlow<Art?> = known.getOrPut(key) { MutableStateFlow(null) }
    fun art(key: String): StateFlow<Art?> = flow(key)

    // ---- AniList, batched: one request at a time, up to 16 searches each (30 requests a minute allowed) ----

    private class Search(val name: String, val result: CompletableDeferred<JSONArray?>)

    private val queue = ArrayDeque<Search>()
    private val queueLock = Mutex()
    private var draining = false

    /** While a video fills its buffer, lookups wait: covers must not take its bandwidth */
    val held = MutableStateFlow(false)

    private suspend fun search(name: String): JSONArray? {
        val s = Search(name, CompletableDeferred())
        val start = queueLock.withLock {
            queue.addLast(s)
            (!draining).also { if (it) draining = true }
        }
        if (start) scope.launch { drain() }
        return s.result.await()
    }

    private suspend fun drain() {
        while (true) {
            delay(150) // let the rest of a screenful of cards join this batch
            held.first { !it }
            val batch = queueLock.withLock {
                if (queue.isEmpty()) {
                    draining = false
                    return
                }
                List(minOf(BATCH, queue.size)) { queue.removeFirst() }
            }
            val vars = batch.indices.joinToString(",") { "\$s$it:String" }
            val body = batch.indices.joinToString(" ") { "m$it:Page(perPage:6){media(search:\$s$it,type:ANIME,sort:SEARCH_MATCH){$FIELDS}}" }
            val variables = JSONObject().apply { batch.forEachIndexed { i, s -> put("s$i", s.name) } }
            val payload = JSONObject().put("query", "query($vars){$body}").put("variables", variables).toString()
            var data: JSONObject? = null
            var retryAfter = 0L
            try {
                http.newCall(
                    Request.Builder().url("https://graphql.anilist.co")
                        .header("Accept", "application/json")
                        .post(payload.toRequestBody("application/json".toMediaType())).build(),
                ).execute().use {
                    if (it.code == 429) retryAfter = (it.header("Retry-After")?.toLongOrNull() ?: 60) * 1000
                    else if (it.isSuccessful) data = JSONObject(it.body!!.string()).optJSONObject("data")
                }
            } catch (_: Exception) {
                // offline or blocked: these titles keep the source image this time
            }
            if (retryAfter > 0) {
                // over the limit: put the batch back and wait as told
                queueLock.withLock { batch.asReversed().forEach(queue::addFirst) }
                delay(retryAfter)
                continue
            }
            batch.forEachIndexed { i, s -> s.result.complete(data?.optJSONObject("m$i")?.optJSONArray("media") ?: if (data == null) null else JSONArray()) }
            delay(GAP_MS)
        }
    }

    /** Lowercase latin letters and digits only; "2nd Season" and "Season 2" read the same */
    fun normalize(name: String): String = Normalizer.normalize(name, Normalizer.Form.NFKD)
        .replace(Regex("[\\u0300-\\u036f]"), "")
        .lowercase()
        .replace("đ", "d")
        .replace(Regex("(\\d+)(?:st|nd|rd|th)\\s+season"), "season $1")
        .replace(Regex("[^a-z0-9]+"), " ")
        .trim()

    /** The first result whose title is one of the names, from the same year (±1) when both are known */
    fun pick(names: List<String>, year: Int?, media: List<JSONObject>): JSONObject? {
        val wanted = names.map(::normalize).filter { it.isNotEmpty() }.toSet()
        return media.firstOrNull { m ->
            val t = m.optJSONObject("title")
            val syn = m.optJSONArray("synonyms")
            val titles = listOfNotNull(t?.optString("romaji"), t?.optString("english"), t?.optString("native")) +
                (0 until (syn?.length() ?: 0)).map { syn!!.optString(it) }
            if (titles.none { it.isNotEmpty() && it != "null" && normalize(it) in wanted }) return@firstOrNull false
            val y = m.optInt("seasonYear").takeIf { it > 0 } ?: m.optJSONObject("startDate")?.optInt("year")?.takeIf { it > 0 }
            year == null || y == null || kotlin.math.abs(y - year) <= 1
        }
    }

    /** Names the source lists under one title: "Hotaru no Yomeiri, Firefly Wedding" */
    fun splitNames(text: String?) = text.orEmpty().split(',', ';', '|').map { it.trim() }.filter { it.length > 1 }

    private val VIETNAMESE = Regex("[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹàáãèéìíòóõùúý]", RegexOption.IGNORE_CASE)
    fun isVietnamese(name: String) = VIETNAMESE.containsMatchIn(name)

    /** Best match among the names; null = no match, Unit-less failure = AniList could not be asked */
    private suspend fun lookup(names: List<String>, year: Int?): Result<JSONObject?> {
        val results = coroutineScope { names.take(3).map { async { search(it) } }.awaitAll() }
        if (results.all { it == null }) return Result.failure(IllegalStateException("offline"))
        val media = results.flatMap { r -> (0 until (r?.length() ?: 0)).map { r!!.getJSONObject(it) } }
        return Result.success(pick(names, year, media))
    }

    private val details = Semaphore(2)

    /** Looks [item] up unless the device already has an answer for it */
    fun request(item: AnimeItem) {
        val key = item.slug.ifEmpty { item.poster }
        if (key.isEmpty() || item.title.isEmpty() || !inFlight.add(key)) return
        scope.launch {
            try {
                val cached = flow(key).value
                if (cached != null && (cached.cover != null || System.currentTimeMillis() - cached.at < RETRY_MISS_MS)) return@launch
                var names = (listOf(item.title) + splitNames(item.subTitle)).filter { it.isNotBlank() && !isVietnamese(it) }
                var match = if (names.isNotEmpty()) lookup(names, item.year) else Result.success(null)
                if (match.getOrNull() == null && match.isSuccess && item.slug.isNotEmpty()) {
                    // a Vietnamese title: the detail page has the original ones
                    val more = runCatching { details.withPermit { AnimeRepository.otherNames(item.slug) } }.getOrDefault(emptyList())
                    names = more.filter { it !in names && !isVietnamese(it) }
                    if (names.isNotEmpty()) match = lookup(names, item.year)
                }
                if (match.isFailure) return@launch
                val m = match.getOrNull()
                val art = Art(
                    m?.optJSONObject("coverImage")?.optString("extraLarge")?.takeIf { it.isNotEmpty() && it != "null" },
                    m?.optString("bannerImage")?.takeIf { it.isNotEmpty() && it != "null" },
                    System.currentTimeMillis(),
                )
                prefs.edit().putString(key, JSONObject().put("c", art.cover ?: "").put("b", art.banner ?: "").put("at", art.at).toString()).apply()
                flow(key).value = art
            } finally {
                inFlight.remove(key)
            }
        }
    }
}
