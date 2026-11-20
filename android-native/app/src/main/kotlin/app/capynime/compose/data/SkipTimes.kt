package app.capynime.compose.data

import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import okhttp3.Call
import okhttp3.Callback
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.text.Normalizer
import java.util.Locale
import java.util.concurrent.TimeUnit
import kotlin.coroutines.resume
import kotlin.math.roundToInt

data class SkipInterval(val start: Double, val end: Double) {
    fun contains(seconds: Double, tailGuard: Double = 0.0) =
        seconds.isFinite() && seconds >= start && seconds < end - tailGuard
}

data class SkipTimes(val op: SkipInterval? = null, val ed: SkipInterval? = null) {
    fun openingAt(seconds: Double) = op?.takeIf { it.contains(seconds, tailGuard = 2.0) }

    fun inEnding(seconds: Double, duration: Double) =
        duration.isFinite() && duration > 0 && seconds.isFinite() && seconds <= duration &&
            ed?.let { seconds >= it.start && it.end >= duration - 30 } == true
}

/** AniList identifies the exact anime; AniSkip supplies intervals for this episode's actual cut. */
object SkipTimesRepository {
    private const val DAY = 24L * 60 * 60 * 1000
    private const val MISS_TTL = 30L * 60 * 1000
    private const val CACHE_LIMIT = 96
    private val client by lazy {
        OkHttpClient.Builder().connectTimeout(5, TimeUnit.SECONDS).readTimeout(6, TimeUnit.SECONDS)
            .callTimeout(8, TimeUnit.SECONDS).build()
    }
    private data class Cached<T>(val value: T, val expiresAt: Long)
    private val ids = LinkedHashMap<String, Cached<Int?>>()
    private val times = LinkedHashMap<String, Cached<SkipTimes>>()
    private val lock = Mutex()

    fun searchNames(title: String, otherNames: String?) =
        (otherNames.orEmpty().split(',', ';', '|') + title).map(String::trim)
            .filter { it.length > 1 }.distinctBy(::normalize).take(4)

    fun episodeNumberOf(name: String): Double? =
        Regex("^(?:tập\\s*)?(\\d+(?:\\.\\d+)?)", RegexOption.IGNORE_CASE)
            .find(name.trim())?.groupValues?.get(1)?.toDoubleOrNull()?.takeIf { it.isFinite() && it > 0 }

    /** Preserve Japanese/native titles while normalizing accents, punctuation and season numbering. */
    fun normalize(name: String): String = Normalizer.normalize(name, Normalizer.Form.NFKD)
        .replace(Regex("\\p{M}+"), "").lowercase(Locale.ROOT).replace('đ', 'd')
        .replace(Regex("(\\d+)(?:st|nd|rd|th)\\s+season"), "season $1")
        .replace(Regex("[^\\p{L}\\p{N}]+"), " ").trim()

    /** Fuzzy search results are never enough to skip video; both a title and a known year must agree. */
    fun pickMalId(names: List<String>, year: Int?, media: JSONArray): Int? {
        val wanted = names.map(::normalize).filter(String::isNotEmpty).toSet()
        val matches = (0 until media.length()).mapNotNull { media.optJSONObject(it) }.filter { m ->
            if (m.optInt("idMal") <= 0) return@filter false
            val title = m.optJSONObject("title")
            val synonyms = m.optJSONArray("synonyms")
            val titles = listOfNotNull(title?.optString("romaji"), title?.optString("english"), title?.optString("native")) +
                (0 until (synonyms?.length() ?: 0)).map { synonyms!!.optString(it) }
            val sourceYear = m.optInt("seasonYear").takeIf { it > 0 }
                ?: m.optJSONObject("startDate")?.optInt("year")?.takeIf { it > 0 }
            titles.any { it != "null" && normalize(it) in wanted } && (year == null || sourceYear == null || sourceYear == year)
        }
        val pick = matches.firstOrNull { year != null && it.optInt("seasonYear") == year } ?: matches.firstOrNull()
        return pick?.optInt("idMal")
    }

    fun parseTimes(results: JSONArray, duration: Double): SkipTimes {
        if (!duration.isFinite() || duration <= 0) return SkipTimes()
        var op: SkipInterval? = null
        var ed: SkipInterval? = null
        for (i in 0 until results.length()) {
            val result = results.optJSONObject(i) ?: continue
            val interval = result.optJSONObject("interval") ?: continue
            val start = interval.optDouble("startTime", Double.NaN)
            val end = interval.optDouble("endTime", Double.NaN)
            if (!start.isFinite() || !end.isFinite() || start < 0 || end <= start || end > duration) continue
            val range = SkipInterval(start, end)
            when (result.optString("skipType")) {
                "op", "mixed-op" -> if (op == null) op = range
                "ed", "mixed-ed" -> if (ed == null) ed = range
            }
        }
        return SkipTimes(op, ed)
    }

    suspend fun lookup(slug: String, title: String, otherNames: String, year: Int?, episodeName: String, duration: Double): SkipTimes {
        val episode = episodeNumberOf(episodeName) ?: return SkipTimes()
        if (!duration.isFinite() || duration <= 0 || duration > 24 * 60 * 60) return SkipTimes()
        val names = searchNames(title, otherNames)
        if (names.isEmpty()) return SkipTimes()
        val idKey = "$slug|$year|${names.joinToString("|") { normalize(it) }}"
        val cachedId = lock.withLock { ids[idKey]?.takeIf { it.expiresAt > System.currentTimeMillis() } }
        val malId = if (cachedId != null) cachedId.value else {
            val found = findMalId(names, year)
            lock.withLock { putBounded(ids, idKey, found, if (found == null) MISS_TTL else 7 * DAY) }
            found
        } ?: return SkipTimes()
        val length = duration.roundToInt()
        val key = "$malId|$episode|$length"
        lock.withLock { times[key]?.takeIf { it.expiresAt > System.currentTimeMillis() } }?.let { return it.value }
        val episodePath = if (episode % 1.0 == 0.0) episode.toInt().toString() else episode.toString()
        val url = "https://api.aniskip.com/v2/skip-times/$malId/$episodePath".toHttpUrl().newBuilder()
            .apply { listOf("op", "ed", "mixed-op", "mixed-ed").forEach { addQueryParameter("types[]", it) } }
            .addQueryParameter("episodeLength", length.toString()).build()
        val json = json(Request.Builder().url(url).header("Accept", "application/json").build())
        val answer = if (json?.optBoolean("found") == true) parseTimes(json.optJSONArray("results") ?: JSONArray(), duration) else SkipTimes()
        lock.withLock { putBounded(times, key, answer, if (answer.op == null && answer.ed == null) MISS_TTL else DAY) }
        return answer
    }

    private suspend fun findMalId(names: List<String>, year: Int?): Int? {
        val query = "query(\$q:String){Page(perPage:5){media(search:\$q,type:ANIME){idMal seasonYear startDate{year} title{romaji english native} synonyms}}}"
        for (name in names.take(3)) {
            val body = JSONObject().put("query", query).put("variables", JSONObject().put("q", name)).toString()
            val response = json(Request.Builder().url("https://graphql.anilist.co").header("Accept", "application/json")
                .post(body.toRequestBody("application/json".toMediaType())).build()) ?: continue
            val media = response.optJSONObject("data")?.optJSONObject("Page")?.optJSONArray("media") ?: continue
            pickMalId(names, year, media)?.let { return it }
        }
        return null
    }

    private fun <T> putBounded(cache: LinkedHashMap<String, Cached<T>>, key: String, value: T, ttl: Long) {
        cache.remove(key)
        cache[key] = Cached(value, System.currentTimeMillis() + ttl)
        while (cache.size > CACHE_LIMIT) cache.remove(cache.keys.first())
    }

    /** Cancelling a screen also cancels its socket; parsing stays on OkHttp's worker thread. */
    private suspend fun json(request: Request): JSONObject? = withContext(Dispatchers.IO) {
        suspendCancellableCoroutine { continuation ->
            val call = client.newCall(request)
            continuation.invokeOnCancellation { call.cancel() }
            call.enqueue(object : Callback {
                override fun onFailure(call: Call, e: IOException) {
                    if (continuation.isActive) continuation.resume(null)
                }
                override fun onResponse(call: Call, response: Response) {
                    val result = response.use {
                        if (!it.isSuccessful) null else try {
                            JSONObject(it.body?.string().orEmpty())
                        } catch (e: CancellationException) {
                            throw e
                        } catch (_: Exception) {
                            null
                        }
                    }
                    if (continuation.isActive) continuation.resume(result)
                }
            })
        }
    }
}
