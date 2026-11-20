package app.capynime.compose.data

import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import org.json.JSONArray
import org.json.JSONObject
import java.net.URLEncoder
import java.security.MessageDigest

/**
 * The app's view of the source (port of src/core/anime-api.ts and the comments / account endpoints): pages of
 * the source turned into the app's own models. Every call goes through [Source] (cookies, Referer, failover).
 */
object AnimeRepository {
    private const val ME_PAGE = "/lich-chieu-phim.html"

    // ---- catalog ----
    suspend fun home(): HomeData = Parsers.home(Source.page("/").body)

    suspend fun menu(): List<MenuGroup> = Parsers.menu(Source.page("/").body)

    /** One page of a list the menu links to (list/browse.ts) */
    suspend fun browse(path: String, page: Int): Page {
        require(Parsers.BROWSE_PATH.matches(path)) { "Danh sách không hỗ trợ: $path" }
        val url = if (page > 1 && path.endsWith("/")) "${path}trang-$page.html" else path
        val html = Source.page(url).body
        if (path.startsWith("/bang-xep-hang/")) return Page(Parsers.ranking(html), 1, 1)
        return Parsers.list(html, page)
    }

    suspend fun search(query: String, page: Int = 1): Page {
        val q = URLEncoder.encode(query.trim(), "UTF-8")
        return Parsers.list(Source.page("/tim-kiem/$q/trang-$page.html").body, page)
    }

    suspend fun schedule(): List<ScheduleDay> = Parsers.schedule(Source.page("/lich-chieu-phim.html").body)

    /** Poster, wide banner and synopsis of one title, for the hero (anime-api.ts enrich) */
    suspend fun enrich(item: AnimeItem): AnimeItem = runCatching {
        val d = Parsers.detail(Source.page("/phim/${item.slug}/").body)
        item.copy(
            poster = d.image.ifEmpty { item.poster },
            backdrop = d.banner.ifEmpty { SourceHosts.fixUrl(d.poster) }.ifEmpty { item.poster },
            subTitle = d.othername.ifEmpty { item.subTitle },
            synopsis = d.description.ifEmpty { item.synopsis },
            genres = d.genres.ifEmpty { item.genres },
            year = d.year ?: item.year,
        )
    }.getOrDefault(item)

    /** The title's other names from its detail page, for the AniList lookup (hd-art.ts moreNames) */
    suspend fun otherNames(slug: String): List<String> = HdArt.splitNames(Parsers.detail(Source.page("/phim/$slug/").body).othername)

    suspend fun detail(slug: String): AnimeDetail = coroutineScope {
        val page = async { Parsers.detail(Source.page("/phim/$slug/").body) }
        // an upcoming title has no watch page yet
        val chapters = async { runCatching { Parsers.episodes(Source.page("/phim/$slug/xem-phim.html").body) }.getOrDefault(emptyList()) }
        val d = page.await()
        val poster = d.image
        AnimeDetail(
            slug = slug,
            title = d.name,
            subTitle = d.othername,
            poster = poster,
            backdrop = d.banner.ifEmpty { SourceHosts.fixUrl(d.poster) }.ifEmpty { poster },
            synopsis = d.description,
            genres = d.genres,
            year = d.year,
            status = d.status,
            views = d.views?.let(Parsers::formatCount).orEmpty(),
            rating = d.rate,
            quality = d.quality,
            trailer = d.trailer,
            episodes = chapters.await(),
            seasons = d.seasons.map { (title, path) -> Season(title, Parsers.slugOf(path), Parsers.slugOf(path) == slug) },
            related = d.related,
            facts = listOf(
                "Trạng thái" to d.status, "Thời lượng" to d.duration, "Season" to d.seasonOf, "Đạo diễn" to d.authors,
                "Studio" to d.studio, "Quốc gia" to d.countries, "Ngôn ngữ" to d.language, "Chất lượng" to d.quality,
                "Theo dõi" to (d.follows?.let(Parsers::formatCount) ?: ""),
            ).filter { it.second.isNotBlank() },
        )
    }

    /** What plays an episode (player/fetch.ts PlayerLink + anime-api.ts getStreamUrl) */
    suspend fun stream(episode: Episode): Stream {
        val answer = Source.json(
            Source.post("/ajax/player", mapOf("id" to episode.id, "play" to episode.play, "link" to episode.hash, "backuplinks" to "1")),
        )
        val tech = answer.optString("playTech")
        val link = answer.opt("link")
        if (tech == "iframe" && link is String) return Stream.Embed(safeUrl(link.substringBefore('#')))
        if (link is JSONArray) {
            for (i in 0 until link.length()) {
                val source = link.optJSONObject(i) ?: continue
                val file = source.optString("file")
                if ("://" in file || file.startsWith("//")) return Stream.File(safeUrl(file), source.optString("label", "HD"))
            }
            throw SourceException("Server này dùng luồng mã hoá chưa hỗ trợ trên app, hãy thử tập hoặc server khác")
        }
        throw SourceException("Không tìm thấy nguồn phát của tập này")
    }

    /** Only https pages and streams: anything else (javascript:) would run inside the player WebView */
    private fun safeUrl(url: String): String {
        val u = if (url.startsWith("//")) "https:$url" else url
        require(u.startsWith("https://")) { "Từ chối liên kết phát không an toàn" }
        return u
    }

    // ---- comments (comments/fetch.ts) ----
    fun filmIdOf(slug: String) = Regex("-a(\\d+)$").find(slug)?.groupValues?.get(1)?.toIntOrNull() ?: 0

    private suspend fun ok(page: SourcePage): JSONObject {
        val o = Source.json(page)
        if (!o.optBoolean("success")) {
            val errors = o.optJSONObject("errors")
            val first = errors?.keys()?.asSequence()?.firstOrNull()?.let { errors.optString(it) }
            throw SourceException(o.optString("error").ifEmpty { first ?: o.optString("message").ifEmpty { "Nguồn từ chối yêu cầu" } })
        }
        return o
    }

    suspend fun comments(filmId: Int, offset: Int): CommentPage {
        val o = ok(Source.get("/ajax/comment?action=get&film_id=$filmId&sort=newest&offset=$offset"))
        val list = o.optJSONArray("comments") ?: JSONArray()
        return CommentPage(
            comments = (0 until list.length()).map { Parsers.comment(list.getJSONObject(it)) },
            total = o.optInt("total"),
            hasMore = o.optBoolean("has_more"),
            offset = o.optInt("offset"),
        )
    }

    suspend fun replies(commentId: Int): List<Comment> {
        val o = ok(Source.get("/ajax/comment?action=get_replies&comment_id=$commentId&sort=newest&offset=0"))
        val list = o.optJSONArray("replies") ?: JSONArray()
        return (0 until list.length()).map { Parsers.comment(list.getJSONObject(it)) }
    }

    /** Returns true when the comment waits for moderation */
    suspend fun postComment(filmId: Int, content: String, spoiler: Boolean, episode: Episode?): Boolean {
        val o = ok(
            Source.post(
                "/ajax/comment",
                mapOf(
                    "action" to "post", "film_id" to filmId.toString(), "episode_id" to (episode?.id ?: "0"),
                    "content" to content, "is_spoiler" to if (spoiler) "1" else "0",
                    "thread_key" to (episode?.name ?: ""), "parent_id" to "0",
                ),
            ),
        )
        return o.optBoolean("pending")
    }

    // ---- account (comments/fetch.ts Me / Login / Logout, account/fetch.ts) ----
    suspend fun me(): SourceUser? = Parsers.user(Source.get(ME_PAGE).body)

    suspend fun login(email: String, password: String): SourceUser {
        val form = Source.get("/account/login/").body
        val csrf = Regex("name=\"_csrf\"\\s+value=\"([^\"]+)\"").find(form)?.groupValues?.get(1)
        if (csrf == null) return Parsers.user(form) ?: me() ?: throw SourceException("Không mở được trang đăng nhập của nguồn")
        // like the source's login.js: only md5(password) leaves the device
        val page = Source.post(
            "/account/login/?_fxRef=" + URLEncoder.encode(ME_PAGE, "UTF-8"),
            mapOf("email" to email.trim(), "password" to "", "password_md5" to md5(password), "save_password" to "1", "_csrf" to csrf, "submit" to ""),
        )
        return Parsers.user(page.body) ?: me() ?: throw SourceException("Sai tài khoản hoặc mật khẩu")
    }

    suspend fun logout() {
        Source.get("/thoat")
        if (me() != null) throw SourceException("Nguồn chưa xác nhận đăng xuất, hãy thử lại")
        Source.clearCookies()
    }

    suspend fun notifications(): List<Notice> {
        val o = ok(Source.get("/ajax/comment?action=get_notifications"))
        val list = o.optJSONArray("notifications") ?: JSONArray()
        return (0 until list.length()).map { i ->
            val n = list.getJSONObject(i)
            Notice(
                type = n.optString("type"),
                from = n.optString("from_user_fullname").ifEmpty { n.optString("from_user_name").ifEmpty { "Ai đó" } },
                slug = Regex("/phim/([^/]+)/").find(n.optString("film_url"))?.groupValues?.get(1),
                read = n.optString("is_read") != "0",
                createdAt = n.optLong("created_at") * 1000,
            )
        }
    }

    suspend fun markNotificationsRead() {
        runCatching { Source.post("/ajax/comment", mapOf("action" to "mark_notifications_read", "ids" to "all")) }
    }

    fun md5(text: String): String =
        MessageDigest.getInstance("MD5").digest(text.toByteArray(Charsets.UTF_8)).joinToString("") { "%02x".format(it) }
}
