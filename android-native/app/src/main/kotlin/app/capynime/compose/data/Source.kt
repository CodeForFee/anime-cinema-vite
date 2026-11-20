package app.capynime.compose.data

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.FormBody
import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/** A source answer: the final URL after redirects and the body */
class SourcePage(val url: String, val body: String, val code: Int)

class SourceException(message: String, val code: Int = 0) : IOException(message)

/**
 * Every request to the source (port of src/core/source/transport.ts + source-host.ts): the viewer's own cookies
 * (kept on the device, so a sign-in survives restarts), the source Referer, a one-minute cache for pages read
 * in several ways, and moving to a working domain when the current one stops answering.
 */
object Source {
    const val USER_AGENT =
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36"

    lateinit var client: OkHttpClient
        private set
    private lateinit var cookies: PersistentCookieJar

    fun init(context: Context) {
        SourceHosts.init(context)
        cookies = PersistentCookieJar(context.getSharedPreferences("cookies", Context.MODE_PRIVATE))
        client = OkHttpClient.Builder()
            .cookieJar(cookies)
            .connectTimeout(12, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .callTimeout(25, TimeUnit.SECONDS)
            .addInterceptor(Interceptor { chain ->
                val request = chain.request()
                val builder = request.newBuilder().header("User-Agent", USER_AGENT)
                    .header("Accept-Language", "vi-VN,vi;q=0.9,en;q=0.8")
                // the source and its CDN serve only requests that come from its own pages
                if (SourceHosts.isSourceFamily(request.url.host) && request.header("Referer") == null)
                    builder.header("Referer", "${SourceHosts.origin}/")
                chain.proceed(builder.build())
            })
            .build()
    }

    /** Signs the device out of the source: its cookies go */
    fun clearCookies() {
        cookies.clear()
        cache.clear()
    }

    // ---- cache: one request for pages read in several ways (home + menu) ----
    private class Cached(val at: Long, val page: SourcePage)

    private val cache = BoundedCache<String, Cached>(24)
    private val cacheLock = Mutex()

    suspend fun page(path: String, fresh: Boolean = false): SourcePage {
        if (!fresh) cacheLock.withLock { cache[path]?.takeIf { System.currentTimeMillis() - it.at < 60_000 } }?.let { return it.page }
        val page = get(path)
        cacheLock.withLock { cache.put(path, Cached(System.currentTimeMillis(), page)) }
        return page
    }

    suspend fun get(path: String): SourcePage = withFailover { origin -> execute(Request.Builder().url(origin + path).build()) }

    suspend fun post(path: String, form: Map<String, String>): SourcePage = withFailover { origin ->
        val body = FormBody.Builder().apply { form.forEach { (k, v) -> add(k, v) } }.build()
        execute(
            Request.Builder().url(origin + path).post(body)
                .header("X-Requested-With", "XMLHttpRequest")
                .header("Origin", origin)
                .header("Accept", "application/json, text/javascript, */*; q=0.01")
                .build(),
        )
    }

    /** A JSON answer of an /ajax endpoint */
    suspend fun json(page: SourcePage): JSONObject = runCatching { JSONObject(page.body) }
        .getOrElse { throw SourceException("Nguồn trả về dữ liệu không đọc được") }

    private suspend fun execute(request: Request): SourcePage = withContext(Dispatchers.IO) {
        val call = client.newCall(request)
        val response = suspendCancellableCoroutine<okhttp3.Response> { continuation ->
            continuation.invokeOnCancellation { call.cancel() }
            call.enqueue(object : okhttp3.Callback {
                override fun onFailure(call: okhttp3.Call, error: IOException) {
                    if (continuation.isActive) continuation.resumeWithException(error)
                }
                override fun onResponse(call: okhttp3.Call, response: okhttp3.Response) {
                    continuation.resume(response) { _, value, _ -> value.close() }
                }
            })
        }
        response.use { response ->
            val body = response.body?.string().orEmpty()
            if (!response.isSuccessful) throw SourceException("Nguồn trả lỗi ${response.code}", response.code)
            if (response.code == 200 && body.contains("<title>Just a moment", ignoreCase = true))
                throw SourceException("Nguồn yêu cầu xác minh truy cập", 403)
            val finalHost = SourceHosts.sourceHostOf(response.request.url.toString())
            if (SourceHosts.isSourceFamily(response.request.url.host) && finalHost != null && finalHost != SourceHosts.host)
                SourceHosts.adopt(finalHost) // the source moved: follow its redirect
            SourcePage(response.request.url.toString(), body, response.code)
        }
    }

    private suspend fun withFailover(block: suspend (origin: String) -> SourcePage): SourcePage {
        val before = SourceHosts.host
        return try {
            block(SourceHosts.origin)
        } catch (error: IOException) {
            val code = (error as? SourceException)?.code ?: 0
            if (code in 400..499) throw error
            val next = resolveHost(before) ?: throw error
            block("https://$next")
        }
    }

    // ---- domain failover: every failed caller shares one discovery round ----
    private val resolving = Mutex()

    private fun isSourceHome(page: SourcePage) =
        page.code == 200 && SourceHosts.sourceHostOf(page.url) != null &&
            Regex("class\\s*=\\s*[\"'][^\"']*\\bMovieList(?:Top|Sld)Cn\\b", RegexOption.IGNORE_CASE).containsMatchIn(page.body) &&
            Regex("class\\s*=\\s*[\"'][^\"']*\\bTPostMv\\b", RegexOption.IGNORE_CASE).containsMatchIn(page.body)

    suspend fun resolveHost(failed: String? = null): String? = resolving.withLock {
        if (SourceHosts.host != failed) return SourceHosts.host // another caller already moved
        val urls = listOf(SourceHosts.OFFICIAL_LINK) +
            SourceHosts.INVENTORY.filter { it != failed }.map { "https://$it/" }
        val found = withTimeoutOrNull(20_000) {
            coroutineScope {
                urls.map { url ->
                    async {
                        runCatching {
                            val page = execute(Request.Builder().url(url).build())
                            SourceHosts.sourceHostOf(page.url)?.takeIf { isSourceHome(page) && it != failed }
                        }.getOrNull()
                    }
                }.awaitAll().firstOrNull { it != null }
            }
        }
        found?.also(SourceHosts::adopt)
    }
}

/** OkHttp cookies kept in SharedPreferences: the source session (sign-in) survives app restarts */
class PersistentCookieJar(private val prefs: SharedPreferences) : CookieJar {
    private val store = LinkedHashMap<String, Cookie>()

    init {
        val saved = prefs.getString("all", null)
        if (saved != null) runCatching {
            val array = JSONArray(saved)
            for (i in 0 until array.length()) {
                val o = array.getJSONObject(i)
                val cookie = Cookie.Builder().name(o.getString("n")).value(o.getString("v")).path(o.getString("p"))
                    .expiresAt(o.getLong("e")).apply {
                        if (o.getBoolean("ho")) hostOnlyDomain(o.getString("d")) else domain(o.getString("d"))
                        if (o.getBoolean("s")) secure()
                        if (o.getBoolean("h")) httpOnly()
                    }.build()
                store[key(cookie)] = cookie
            }
        }
    }

    private fun key(c: Cookie) = "${c.domain}|${c.path}|${c.name}"

    @Synchronized
    override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
        cookies.forEach { store[key(it)] = it }
        persist()
    }

    @Synchronized
    override fun loadForRequest(url: HttpUrl): List<Cookie> {
        val now = System.currentTimeMillis()
        store.values.removeAll { it.expiresAt < now }
        return store.values.filter { it.matches(url) }
    }

    @Synchronized
    fun clear() {
        store.clear()
        persist()
    }

    private fun persist() {
        val array = JSONArray()
        // session cookies too: the source may keep its sign-in in one (PHPSESSID), the app outlives no browser
        store.values.forEach { c ->
            array.put(
                JSONObject().put("n", c.name).put("v", c.value).put("p", c.path).put("e", c.expiresAt).put("d", c.domain)
                    .put("ho", c.hostOnly).put("s", c.secure).put("h", c.httpOnly),
            )
        }
        prefs.edit().putString("all", array.toString()).apply()
    }
}

/** Absolute source URL for a path, for links the app opens in a browser */
fun sourceUrl(path: String) = (SourceHosts.origin + path).toHttpUrl().toString()
