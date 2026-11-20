package app.capynime.compose.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import org.jsoup.Jsoup
import java.security.MessageDigest

data class AccountGenre(val id: String, val name: String, val checked: Boolean)
data class AccountProfile(
    val fullname: String,
    val gender: String,
    val bio: String,
    val social: Map<String, String>,
    val genres: List<String>,
    val isPrivate: Boolean,
)
data class AccountInfo(
    val name: String,
    val handle: String,
    val joined: String,
    val avatar: String,
    val profile: AccountProfile,
    val genres: List<AccountGenre>,
    val email: String,
    val emailVerified: Boolean,
    val username: String,
    val passwordNote: String,
    val passwordMode: String,
    val emailNeedsPassword: Boolean,
    val usernameLocked: Boolean,
)
data class OwnComment(
    val id: Int,
    val title: String,
    val slug: String?,
    val episode: String,
    val content: String,
    val pending: Boolean,
    val hidden: Boolean,
    val hideReason: String,
    val createdAt: Long,
)
data class OwnCommentPage(val comments: List<OwnComment>, val hasMore: Boolean, val offset: Int)

/** Source account contracts, matching the web account endpoint module. Private answers are never cached. */
object AccountRepository {
    val socials = linkedMapOf(
        "social_fb" to "Facebook", "social_discord" to "Discord", "social_youtube" to "YouTube",
        "social_mal" to "MyAnimeList", "social_instagram" to "Instagram", "social_threads" to "Threads",
        "social_tiktok" to "TikTok",
    )

    fun parseInfo(html: String): AccountInfo? {
        val doc = Jsoup.parse(html)
        if (doc.selectFirst("#upe-panel-hoso") == null) return null
        fun value(selector: String) = doc.selectFirst(selector)?.attr("value").orEmpty()
        fun text(selector: String) = doc.selectFirst(selector)?.text().orEmpty().trim()
        val genres = doc.select("#upe-chips input[type=checkbox]").map {
            AccountGenre(it.attr("value"), it.parent()?.text().orEmpty().trim(), it.hasAttr("checked"))
        }
        return AccountInfo(
            name = text(".upe-name"), handle = text(".upe-handle"), joined = text(".upe-joined"),
            avatar = doc.selectFirst("#upe-avatar-img")?.attr("src").orEmpty(),
            profile = AccountProfile(
                value("#upe-fullname"), value("input[name=gender][checked]").ifEmpty { "2" }, doc.selectFirst("#upe-bio")?.wholeText().orEmpty(),
                socials.keys.associateWith { value("input[name=$it]") }, genres.filter { it.checked }.map { it.id },
                doc.selectFirst("#upe-private")?.hasAttr("checked") == true,
            ),
            genres = genres, email = text("#upe-current-email"),
            emailVerified = doc.selectFirst("#upe-panel-taikhoan .upe-badge-ok") != null,
            username = text("#upe-current-username").removePrefix("@"),
            passwordNote = doc.select("#upe-panel-taikhoan .upe-acc-row").getOrNull(2)?.selectFirst(".upe-acc-value")?.text().orEmpty(),
            passwordMode = doc.selectFirst("#upe-submit-password")?.attr("data-mode").orEmpty().ifEmpty { "change" },
            emailNeedsPassword = doc.selectFirst("#upe-email-password") != null,
            usernameLocked = doc.select("[data-modal=username]").any { it.hasClass("is-disabled") || it.hasAttr("disabled") },
        )
    }

    fun profileBody(profile: AccountProfile): Map<String, String> {
        require(profile.fullname.length <= 50) { "Tên hiển thị tối đa 50 ký tự" }
        require(profile.bio.length <= 280) { "Giới thiệu tối đa 280 ký tự" }
        require(profile.gender in setOf("0", "1", "2")) { "Giới tính không hợp lệ" }
        require(profile.genres.size <= 10) { "Chọn tối đa 10 thể loại" }
        return mapOf(
            "fullname" to profile.fullname, "gender" to profile.gender, "bio" to profile.bio,
            "favorite_genres" to profile.genres.distinct().joinToString(","), "is_private" to if (profile.isPrivate) "1" else "0",
        ) + socials.keys.associateWith { profile.social[it].orEmpty() }
    }

    fun usernameBody(username: String): Map<String, String> {
        val next = username.trim()
        require(Regex("[A-Za-z0-9_]{3,20}").matches(next)) { "Username cần 3–20 chữ, số hoặc dấu _" }
        return mapOf("new_username" to next)
    }

    fun emailBody(email: String, password: String?, needsPassword: Boolean): Map<String, String> {
        val next = email.trim()
        require(Regex("[^\\s@]+@[^\\s@]+\\.[^\\s@]+").matches(next)) { "Email chưa hợp lệ" }
        require(!needsPassword || !password.isNullOrEmpty()) { "Nhập mật khẩu để xác nhận đổi email" }
        return mapOf("new_email" to next) + if (password.isNullOrEmpty()) emptyMap() else mapOf("password_md5" to md5(password))
    }

    fun passwordBody(next: String, confirm: String, current: String?, setMode: Boolean): Map<String, String> {
        require(next.length >= 6) { "Mật khẩu mới phải từ 6 ký tự" }
        require(next == confirm) { "Mật khẩu mới và xác nhận không khớp" }
        require(setMode || !current.isNullOrEmpty()) { "Nhập mật khẩu hiện tại" }
        return mapOf("new_password_md5" to md5(next), "confirm_password_md5" to md5(confirm)) +
            if (setMode) emptyMap() else mapOf("current_password_md5" to md5(current!!))
    }

    fun answer(raw: String): JSONObject {
        val json = runCatching { JSONObject(raw) }.getOrElse { throw SourceException("Nguồn trả về dữ liệu không đọc được") }
        if (!json.optBoolean("success")) {
            val errors = json.optJSONObject("errors")
            val first = errors?.keys()?.asSequence()?.firstOrNull()?.let { errors.optString(it) }
            throw SourceException(json.optString("error").ifEmpty { first ?: json.optString("message").ifEmpty { "Nguồn từ chối yêu cầu" } })
        }
        return json
    }

    fun parseComments(raw: String): OwnCommentPage {
        val json = answer(raw)
        val rows = json.optJSONArray("comments")
        return OwnCommentPage((0 until (rows?.length() ?: 0)).map { index ->
            val row = rows!!.getJSONObject(index)
            val film = row.optInt("film_id")
            val base = row.optString("film_slug")
            val slug = if (film == 0) null else if (base.isNotBlank()) {
                if (base.endsWith("-a$film")) base else "$base-a$film"
            } else Regex("/phim/([^/]+)/").find(row.optString("comment_url"))?.groupValues?.get(1)
            OwnComment(
                row.optInt("id"), if (film != 0) row.optString("film_name").ifEmpty { "Phim #$film" } else row.optString("page_label").ifEmpty { "Hỏi/đáp" },
                slug?.takeIf { Regex("[A-Za-z0-9_-]+").matches(it) }, row.optString("thread_key").takeUnless { it.startsWith('/') }.orEmpty(),
                row.optString("content"), row.optInt("is_pending") == 1, row.optInt("is_hidden") == 1,
                row.optString("hide_reason"), row.optLong("created_at") * 1000,
            )
        }, json.optBoolean("has_more"), json.optInt("offset"))
    }

    private fun checkUser(userId: Int) {
        check(Library.user.value?.id == userId) { "Phiên đăng nhập đã thay đổi, vui lòng mở lại tài khoản" }
    }

    suspend fun info(userId: Int): AccountInfo? {
        checkUser(userId)
        val page = Source.get("/account/info/")
        checkUser(userId)
        return withContext(Dispatchers.Default) { parseInfo(page.body) }
    }

    private suspend fun write(userId: Int, endpoint: String, body: Map<String, String>) {
        checkUser(userId)
        val page = Source.post(endpoint, body)
        checkUser(userId)
        answer(page.body)
    }

    suspend fun updateProfile(userId: Int, profile: AccountProfile) = write(userId, "/ajax/user/update-profile", profileBody(profile))
    suspend fun changeUsername(userId: Int, username: String) = write(userId, "/ajax/user/change-username", usernameBody(username))
    suspend fun changeEmail(userId: Int, email: String, password: String?, needsPassword: Boolean) =
        write(userId, "/ajax/user/request-email-change", emailBody(email, password, needsPassword))
    suspend fun changePassword(userId: Int, next: String, confirm: String, current: String?, setMode: Boolean) =
        write(userId, "/ajax/user/change-password", passwordBody(next, confirm, current, setMode))

    suspend fun comments(userId: Int, offset: Int = 0): OwnCommentPage {
        checkUser(userId)
        require(offset >= 0)
        val page = Source.get("/ajax/comment?action=get_user_comments&offset=$offset")
        checkUser(userId)
        return parseComments(page.body)
    }

    suspend fun notifications(userId: Int): List<Notice> {
        checkUser(userId)
        val rows = AnimeRepository.notifications()
        checkUser(userId)
        return rows
    }

    suspend fun markNotificationsRead(userId: Int) =
        write(userId, "/ajax/comment", mapOf("action" to "mark_notifications_read", "ids" to "all"))

    private fun md5(text: String) = MessageDigest.getInstance("MD5").digest(text.toByteArray(Charsets.UTF_8)).joinToString("") { "%02x".format(it) }
}
