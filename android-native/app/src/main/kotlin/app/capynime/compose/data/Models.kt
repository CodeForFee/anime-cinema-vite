package app.capynime.compose.data

import androidx.compose.runtime.Immutable

/** A title as lists show it (port of core/types/anime.ts AnimeItem) */
@Immutable
data class AnimeItem(
    val slug: String,
    val title: String,
    val poster: String,
    val backdrop: String = poster,
    val subTitle: String = "",
    val episode: String = "",
    val quality: String = "",
    val rating: Double? = null,
    val year: Int? = null,
    val views: String = "",
    val genres: List<String> = emptyList(),
    val synopsis: String = "",
    val isUpcoming: Boolean = false,
    val rank: Int? = null,
    /** Schedule: air time "15:30" */
    val airTime: String = "",
    /** Schedule: air moment (epoch ms) */
    val airAt: Long? = null,
)

@Immutable
data class Episode(val id: String, val name: String, val hash: String, val play: String) {
    val title: String get() = if (name.isEmpty()) "Tập" else if (name.first().isDigit()) "Tập $name" else name
}

@Immutable
data class Season(val title: String, val slug: String, val isCurrent: Boolean)

@Immutable
data class AnimeDetail(
    val slug: String,
    val title: String,
    val subTitle: String,
    val poster: String,
    val backdrop: String,
    val synopsis: String,
    val genres: List<String>,
    val year: Int?,
    val status: String,
    val views: String,
    val rating: Double?,
    val quality: String,
    val trailer: String?,
    val episodes: List<Episode>,
    val seasons: List<Season>,
    val related: List<AnimeItem>,
    val facts: List<Pair<String, String>>,
) {
    val isUpcoming: Boolean get() = episodes.isEmpty()
    fun toItem() = AnimeItem(slug, title, poster, backdrop, subTitle, quality = quality, rating = rating, year = year, genres = genres, synopsis = synopsis)
}

@Immutable
data class MenuGroup(val label: String, val items: List<MenuLink>)

@Immutable
data class MenuLink(val label: String, val path: String)

@Immutable
data class HomeData(
    val featured: List<AnimeItem>,
    val latest: List<AnimeItem>,
    val thisSeason: List<AnimeItem>,
    val upcoming: List<AnimeItem>,
    val hot: List<AnimeItem>,
    /** #hot-home: the "Phim Đề Cử Đặc Sắc" shelf */
    val nominate: List<AnimeItem> = emptyList(),
)

@Immutable
data class Page(val items: List<AnimeItem>, val page: Int, val totalPages: Int)

@Immutable
data class ScheduleDay(val heading: String, val items: List<AnimeItem>) {
    /** "Chủ Nhật, Ngày 25 tháng 10" -> weekday, "25/10" */
    val weekday: String get() = heading.substringBefore(',').trim()
    val date: String
        get() = Regex("Ngày\\s*(\\d+)\\s*tháng\\s*(\\d+)", RegexOption.IGNORE_CASE).find(heading)
            ?.let { "${it.groupValues[1].padStart(2, '0')}/${it.groupValues[2].padStart(2, '0')}" } ?: ""
}

/** What plays an episode: the CDN's own player page (embedded), or a plain stream file */
sealed interface Stream {
    data class Embed(val url: String) : Stream
    data class File(val url: String, val label: String) : Stream
}

@Immutable
data class SourceUser(val id: Int, val name: String, val avatar: String)

@Immutable
data class Comment(
    val id: Int,
    val episodeTag: String,
    val content: String,
    val spoiler: Boolean,
    val votesUp: Int,
    val votesDown: Int,
    val createdAt: Long,
    val pinned: Boolean,
    val repliesCount: Int,
    val userName: String,
    val userAvatar: String,
    val banned: Boolean,
    val badges: List<Pair<String, String>>,
)

@Immutable
data class CommentPage(val comments: List<Comment>, val total: Int, val hasMore: Boolean, val offset: Int)

@Immutable
data class Notice(val type: String, val from: String, val slug: String?, val read: Boolean, val createdAt: Long) {
    val text: String
        get() = when (type) {
            "approved" -> "Bình luận của bạn đã được duyệt"
            "rejected" -> "Bình luận của bạn bị từ chối"
            "reply" -> "$from đã trả lời bình luận của bạn"
            "mention" -> "$from đã nhắc đến bạn"
            else -> "Thông báo mới"
        }
}
