package app.capynime.compose.data

import org.json.JSONObject
import org.jsoup.Jsoup
import org.jsoup.nodes.Document
import org.jsoup.nodes.Element
import java.net.URI

/**
 * The source's pages read the same way the web app reads them (src/core/source/endpoints/<name>/parse.ts and
 * html/getInfoTPost.ts), with Jsoup in place of cheerio. Selectors are kept identical so a change on the
 * source breaks (and is fixed) in both apps alike.
 */
object Parsers {
    /** Lists the source menu links to that the browse screen can read (menu/parse.ts BROWSE_PATH) */
    val BROWSE_PATH = Regex(
        "^/(?:the-loai/[\\w-]+|season/(?:winter|spring|summer|autumn)/\\d{4}|anime-bo|anime-le|hoat-hinh-trung-quoc|anime-sap-chieu|danh-sach/[\\w-]+)/$|^/bang-xep-hang/(?:day|voted|month|season|year)\\.html$",
    )

    fun dom(html: String, base: String = SourceHosts.origin): Document = Jsoup.parse(html, base)

    fun pathOf(href: String?): String {
        if (href.isNullOrBlank()) return ""
        return runCatching { URI(href.trim()).path ?: href }.getOrDefault(href)
    }

    /** "/phim/ten-phim-a1234/" -> "ten-phim-a1234" */
    fun slugOf(path: String) = path.substringAfter("/phim/", path).substringBefore('/')

    private fun Element.firstText(css: String) = selectFirst(css)?.text()?.trim().orEmpty()

    // ---- html/getInfoTPost.ts ----
    fun tpost(el: Element, now: Long): AnimeItem? {
        val path = pathOf(el.selectFirst("a")?.attr("href"))
        if (!path.contains("/phim/")) return null
        val image = SourceHosts.fixUrl(el.selectFirst("img")?.attr("src"))
        val name = el.firstText(".Title")
        val chapRaw = el.selectFirst(".mli-eps > i")?.text()?.trim().orEmpty()
        val chap = if (chapRaw == "TẤT") "Trọn bộ" else chapRaw
        val rate = (el.firstText(".anime-avg-user-rating").ifEmpty { el.firstText(".AAIco-star") }).toDoubleOrNull()
        val views = Regex("[\\d,]+").find(el.firstText(".Year"))?.value?.replace(",", "")
        val quality = el.firstText(".Qlty").ifEmpty { el.firstText(".mli-quality") }
        val process = el.firstText(".AAIco-access_time")
        val year = el.firstText(".AAIco-date_range").take(4).toIntOrNull()
        val description = el.selectFirst(".Description > p")?.text()?.trim().orEmpty()
        val genres = el.select(".Genre > a").map { it.text().trim() }
        val schedule = el.selectFirst(".mli-timeschedule")
        val airAt = schedule?.attr("data-timer_second")?.toLongOrNull()?.let { now + it * 1000 }
        val airTime = el.selectFirst(".Image .b")?.text()?.trim().orEmpty()
            .replace(Regex("(\\d+)\\s*giờ\\s*(\\d+)\\s*phút", RegexOption.IGNORE_CASE)) { m ->
                "${m.groupValues[1].padStart(2, '0')}:${m.groupValues[2]}"
            }
        return AnimeItem(
            slug = slugOf(path),
            title = name,
            poster = image,
            episode = chap.ifEmpty { process },
            quality = quality,
            rating = rate?.takeIf { !it.isNaN() },
            year = year,
            views = views?.toLongOrNull()?.let(::formatCount).orEmpty(),
            genres = genres,
            synopsis = description,
            isUpcoming = schedule != null,
            airTime = airTime,
            airAt = airAt,
        )
    }

    private fun Document.posts(css: String, now: Long) = select(css).mapNotNull { tpost(it, now) }

    // ---- home/parse.ts ----
    fun home(html: String): HomeData {
        val d = dom(html)
        val now = System.currentTimeMillis()
        val carousel = d.posts(".MovieListSldCn .TPostMv", now)
        val nominate = d.posts("#hot-home .TPostMv", now)
        return HomeData(
            featured = (carousel.ifEmpty { nominate }).take(16),
            latest = d.posts("#single-home .TPostMv", now),
            thisSeason = d.select(".MovieListTopCn").firstOrNull()?.select(".TPostMv")
                ?.mapNotNull { tpost(it, now) }?.filterNot { it.poster.contains("big_banner") }.orEmpty(),
            upcoming = d.posts("#new-home .TPostMv", now),
            hot = d.posts("#showTopPhim .TPost", now),
            nominate = nominate,
        )
    }

    // ---- menu/parse.ts ----
    fun menu(html: String): List<MenuGroup> = dom(html).select("nav.Menu ul.sub-menu").mapNotNull { ul ->
        val raw = ul.previousElementSibling()?.takeIf { it.tagName() == "a" }?.text()?.trim().orEmpty()
        val label = if (raw == raw.uppercase()) raw.lowercase().split(" ").joinToString(" ") { w -> w.replaceFirstChar { it.uppercase() } } else raw
        val items = ul.select("a").map { MenuLink(it.text().trim(), pathOf(it.attr("href"))) }.filter { BROWSE_PATH.matches(it.path) }
        if (items.isEmpty()) null else MenuGroup(label, items)
    }

    // ---- list/parse.ts ----
    fun list(html: String, requested: Int): Page {
        val d = dom(html)
        val now = System.currentTimeMillis()
        val items = d.select(".MovieList").firstOrNull()?.select(".TPostMv")?.mapNotNull { tpost(it, now) }.orEmpty()
        val current = d.selectFirst(".current")
        val cur = (current?.attr("data")?.ifEmpty { null } ?: current?.attr("title"))?.toIntOrNull() ?: requested
        val last = d.selectFirst(".larger:last-child, .wp-pagenavi > *:last-child")
        val max = (last?.attr("data")?.ifEmpty { null } ?: last?.attr("title"))?.toIntOrNull() ?: 1
        return Page(items, cur, maxOf(max, cur))
    }

    // ---- ranking/parse.ts ----
    fun ranking(html: String): List<AnimeItem> = dom(html).select(".bxh-movie-phimletv > .group").mapIndexedNotNull { i, g ->
        val path = pathOf(g.selectFirst("a")?.attr("href"))
        if (!path.contains("/phim/")) return@mapIndexedNotNull null
        val image = g.selectFirst("img")?.attr("src")
            ?: Regex("url\\(['\"]?([^'\")]+)").find(g.attr("style"))?.groupValues?.get(1)
        AnimeItem(
            slug = slugOf(path),
            title = g.selectFirst("a")?.text()?.trim().orEmpty(),
            poster = SourceHosts.fixUrl(image),
            subTitle = g.firstText(".txt-info"),
            episode = g.firstText(".score"),
            rank = i + 1,
        )
    }

    // ---- detail/parse.ts + detail/banner.ts ----
    class Detail(
        val name: String, val othername: String, val image: String, val poster: String?, val banner: String,
        val description: String, val rate: Double?, val duration: String, val year: Int?, val views: Long?,
        val seasons: List<Pair<String, String>>, val genres: List<String>, val quality: String, val status: String,
        val authors: String, val countries: String, val follows: Long?, val language: String, val studio: String,
        val seasonOf: String, val trailer: String?, val related: List<AnimeItem>,
    )

    fun detail(html: String): Detail {
        val d = dom(html)
        val now = System.currentTimeMillis()
        fun info(side: String, q: String) = d.select(".$side > .InfoList > .AAIco-adjust")
            .firstOrNull { it.selectFirst("strong")?.text()?.lowercase()?.startsWith(q) == true }
        fun value(e: Element?) = e?.text()?.split(":", limit = 2)?.getOrNull(1)?.trim().orEmpty()
        val crumbs = d.select(".breadcrumb > li > a")
        return Detail(
            name = d.firstText(".Title"),
            othername = d.firstText(".SubTitle"),
            image = SourceHosts.fixUrl(d.selectFirst(".Image img")?.attr("src")),
            poster = d.selectFirst(".TPostBg img")?.attr("src"),
            banner = highResBanner(html),
            description = d.selectFirst(".Description")?.text()?.trim().orEmpty(),
            rate = d.firstText("#average_score").toDoubleOrNull(),
            duration = d.firstText(".AAIco-access_time"),
            year = d.selectFirst(".AAIco-date_range > a")?.text()?.trim()?.toIntOrNull(),
            views = Regex("[\\d,]+").find(d.firstText(".AAIco-remove_red_eye"))?.value?.replace(",", "")?.toLongOrNull(),
            seasons = d.select(".season_item > a").map { it.text().trim() to pathOf(it.attr("href")) },
            genres = if (crumbs.size > 2) crumbs.subList(1, crumbs.size - 1).map { it.text().trim() } else emptyList(),
            quality = d.firstText(".Qlty"),
            status = value(info("mvici-left", "trạng thái")),
            authors = info("mvici-left", "đạo diễn")?.select("a")?.joinToString(", ") { it.text().trim() }.orEmpty(),
            countries = info("mvici-left", "quốc gia")?.select("a")?.joinToString(", ") { it.text().trim() }.orEmpty(),
            follows = value(info("mvici-left", "số người theo dõi")).replace(",", "").toLongOrNull(),
            language = value(info("mvici-right", "ngôn ngữ")),
            studio = value(info("mvici-right", "studio")),
            seasonOf = info("mvici-right", "season")?.selectFirst("a")?.text()?.trim().orEmpty(),
            trailer = d.selectFirst("#Opt1 iframe")?.attr("src"),
            related = d.posts(".MovieListRelated .TPostMv", now),
        )
    }

    /** Sharpest wide image of a title, same order of preference as banner.ts */
    fun highResBanner(html: String): String {
        Regex("https?://cdn\\.animevietsub\\.\\w+/data/big_banner/[^\"'\\s)]+", RegexOption.IGNORE_CASE).find(html)?.let { return it.value }
        Regex("<img[^>]+class=[\"'][^\"']*TPostBg[^\"']*[\"'][^>]+src=[\"']([^\"']+)[\"']", RegexOption.IGNORE_CASE).find(html)
            ?.let { return SourceHosts.fixUrl(it.groupValues[1]) }
        Regex("https?://cdn\\.animevietsub\\.\\w+/data/banner/[^\"'\\s)]+", RegexOption.IGNORE_CASE).find(html)?.let { return it.value }
        return ""
    }

    // ---- episodes/parse.ts ----
    fun episodes(html: String): List<Episode> = dom(html).select("#list-server .list-episode .episode a").map {
        Episode(it.attr("data-id"), it.text().trim(), it.attr("data-hash"), it.attr("data-play").ifEmpty { "api" })
    }

    // ---- schedule/parse.ts ----
    fun schedule(html: String): List<ScheduleDay> {
        val d = dom(html)
        val now = System.currentTimeMillis()
        return d.select("section.Homeschedule").map { s ->
            ScheduleDay(s.selectFirst(".Top h1")?.text()?.trim().orEmpty(), s.select(".TPostMv").mapNotNull { tpost(it, now) })
        }.filter { it.heading.isNotEmpty() }
    }

    // ---- comments/fetch.ts parseUser: the comment box set-up (AvsComment.init) names the signed-in viewer ----
    fun user(html: String): SourceUser? {
        if (!Regex("isLogin:\\s*true").containsMatchIn(html)) return null
        fun field(key: String): String {
            val raw = Regex("$key:\\s*\"((?:[^\"\\\\]|\\\\.)*)\"").find(html)?.groupValues?.get(1) ?: return ""
            return runCatching { JSONObject("{\"v\":\"$raw\"}").getString("v") }.getOrDefault(raw)
        }
        return SourceUser(
            id = Regex("userId:\\s*(\\d+)").find(html)?.groupValues?.get(1)?.toIntOrNull() ?: 0,
            name = field("userFullName").ifEmpty { field("userName") },
            avatar = field("userAvatar"),
        )
    }

    fun comment(o: JSONObject): Comment {
        val badges = o.optJSONArray("badges")
        val thread = o.optString("thread_key")
        return Comment(
            id = o.optInt("id"),
            episodeTag = if (thread.firstOrNull()?.isDigit() == true) "Tập $thread" else "",
            content = decodeEntities(o.optString("content")),
            spoiler = o.optInt("is_spoiler") == 1,
            votesUp = o.optInt("votes_up"),
            votesDown = o.optInt("votes_down"),
            createdAt = o.optLong("created_at") * 1000,
            pinned = o.optInt("is_pinned") == 1 || o.optInt("is_global_pinned") == 1,
            repliesCount = o.optInt("replies_count"),
            userName = o.optString("user_fullname").ifEmpty { o.optString("user_name") },
            userAvatar = o.optString("user_avatar"),
            banned = o.optInt("user_ban") == 1,
            badges = (0 until (badges?.length() ?: 0)).map { i ->
                val b = badges!!.getJSONObject(i)
                b.optString("name") to b.optString("color", "#e53935")
            },
        )
    }

    /** The source stores comment text HTML-escaped */
    fun decodeEntities(text: String): String = if ('&' in text) org.jsoup.parser.Parser.unescapeEntities(text, false) else text

    fun formatCount(n: Long): String = "%,d".format(n).replace(',', '.')
}
