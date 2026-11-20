package app.capynime.compose.data

import org.junit.Assert.*
import org.junit.Test

class AccountRepositoryTest {
    @Test fun parsesProfileAndAccountControlsFromSourceHtml() {
        val info = AccountRepository.parseInfo("""
            <div id="upe-panel-hoso"></div><b class="upe-name">Tên &amp; Việt</b>
            <span class="upe-handle">@capy</span><span class="upe-joined">Tham gia 2026</span>
            <img id="upe-avatar-img" src="https://example.org/avatar.jpg">
            <input id="upe-fullname" value="Tên Việt"><input name="gender" value="0" checked>
            <textarea id="upe-bio">Anime &amp; sách</textarea><input name="social_fb" value="https://facebook.com/capy">
            <input id="upe-private" type="checkbox" checked>
            <div id="upe-chips"><label><input type="checkbox" value="12" checked>Hành động</label><label><input type="checkbox" value="2">Hài hước</label></div>
            <div id="upe-panel-taikhoan"><span class="upe-badge-ok"></span><div class="upe-acc-row"></div><div class="upe-acc-row"></div><div class="upe-acc-row"><span class="upe-acc-value">Đã đặt mật khẩu</span></div></div>
            <span id="upe-current-email"> capy@example.org </span><span id="upe-current-username">@capy</span>
            <button id="upe-submit-password" data-mode="set"></button><input id="upe-email-password">
            <button data-modal="username" class="is-disabled"></button>
        """)!!
        assertEquals("Tên & Việt", info.name)
        assertEquals("Anime & sách", info.profile.bio)
        assertEquals("0", info.profile.gender)
        assertEquals(listOf("12"), info.profile.genres)
        assertEquals("Hành động", info.genres.first().name)
        assertEquals(7, info.profile.social.size)
        assertTrue(info.profile.isPrivate)
        assertTrue(info.emailVerified)
        assertEquals("capy@example.org", info.email)
        assertEquals("capy", info.username)
        assertTrue(info.usernameLocked)
        assertTrue(info.emailNeedsPassword)
        assertEquals("set", info.passwordMode)
    }

    @Test fun loginPageIsNotAnAccountAndMissingControlsUseSafeDefaults() {
        assertNull(AccountRepository.parseInfo("<form id='login'>Đăng nhập</form>"))
        val info = AccountRepository.parseInfo("<div id='upe-panel-hoso'></div>")!!
        assertEquals("change", info.passwordMode)
        assertEquals("2", info.profile.gender)
        assertFalse(info.emailNeedsPassword)
        assertFalse(info.profile.isPrivate)
    }

    @Test fun profileRequestIncludesOnlySupportedFieldsAndLimitsGenres() {
        val profile = AccountProfile("Capy", "2", "Hello", mapOf("social_fb" to "https://facebook.com/capy", "admin" to "1"), listOf("12", "2", "12"), true)
        val body = AccountRepository.profileBody(profile)
        assertEquals("12,2", body["favorite_genres"])
        assertEquals("1", body["is_private"])
        assertEquals("", body["social_threads"])
        assertFalse(body.containsKey("admin"))
        assertThrows(IllegalArgumentException::class.java) { AccountRepository.profileBody(profile.copy(genres = (1..11).map(Int::toString))) }
        assertThrows(IllegalArgumentException::class.java) { AccountRepository.profileBody(profile.copy(bio = "x".repeat(281))) }
        assertThrows(IllegalArgumentException::class.java) { AccountRepository.profileBody(profile.copy(gender = "bad")) }
    }

    @Test fun passwordsAreHashedAndSetModeOmitsCurrentPassword() {
        val set = AccountRepository.passwordBody("secret", "secret", "ignored", true)
        assertEquals("5ebe2294ecd0e0f08eab7690d2a6ee69", set["new_password_md5"])
        assertEquals(set["new_password_md5"], set["confirm_password_md5"])
        assertFalse(set.containsKey("current_password_md5"))
        assertFalse(set.values.contains("secret"))
        val change = AccountRepository.passwordBody("secret", "secret", "old", false)
        assertEquals("149603e6c03516362a8da23f624db945", change["current_password_md5"])
    }

    @Test fun validatesPasswordConfirmationAndRequiredCurrentPassword() {
        assertThrows(IllegalArgumentException::class.java) { AccountRepository.passwordBody("short", "short", null, true) }
        assertThrows(IllegalArgumentException::class.java) { AccountRepository.passwordBody("secret", "different", null, true) }
        assertThrows(IllegalArgumentException::class.java) { AccountRepository.passwordBody("secret", "secret", null, false) }
    }

    @Test fun emailPasswordIsIncludedOnlyWhenProvided() {
        assertEquals(mapOf("new_email" to "capy@example.org"), AccountRepository.emailBody(" capy@example.org ", null, false))
        val body = AccountRepository.emailBody("capy@example.org", "secret", true)
        assertEquals("5ebe2294ecd0e0f08eab7690d2a6ee69", body["password_md5"])
        assertThrows(IllegalArgumentException::class.java) { AccountRepository.emailBody("not-email", null, false) }
        assertThrows(IllegalArgumentException::class.java) { AccountRepository.emailBody("capy@example.org", "", true) }
    }

    @Test fun validatesUsernameAndTrimsUserInput() {
        assertEquals("capy_01", AccountRepository.usernameBody(" capy_01 ")["new_username"])
        assertThrows(IllegalArgumentException::class.java) { AccountRepository.usernameBody("x") }
        assertThrows(IllegalArgumentException::class.java) { AccountRepository.usernameBody("a/b") }
    }

    @Test fun ownCommentParsingKeepsModerationAndSafeFilmLinks() {
        val page = AccountRepository.parseComments("""{"success":true,"comments":[
            {"id":1,"film_id":22,"film_slug":"anime","film_name":"Anime","thread_key":"3","content":"Hi","is_pending":1,"created_at":100},
            {"id":2,"film_id":22,"film_slug":"anime-a22","is_hidden":1,"hide_reason":"Spam","thread_key":"/help"},
            {"id":3,"film_id":22,"comment_url":"https://source.test/phim/anime-a22/"},
            {"id":4,"film_id":0,"page_label":"Hỏi/đáp","content":"Question"}
        ],"has_more":true,"offset":4}""")
        assertEquals("anime-a22", page.comments[0].slug)
        assertEquals("anime-a22", page.comments[1].slug)
        assertEquals("anime-a22", page.comments[2].slug)
        assertEquals(100000L, page.comments[0].createdAt)
        assertTrue(page.comments[0].pending)
        assertTrue(page.comments[1].hidden)
        assertEquals("", page.comments[1].episode)
        assertNull(page.comments[3].slug)
        assertTrue(page.hasMore)
        assertEquals(4, page.offset)
    }

    @Test fun sourceErrorsAndMalformedAnswersRemainFailures() {
        val error = assertThrows(SourceException::class.java) { AccountRepository.answer("""{"success":false,"errors":{"fullname":"Tên quá dài"}}""") }
        assertEquals("Tên quá dài", error.message)
        assertThrows(SourceException::class.java) { AccountRepository.answer("<html>Login</html>") }
    }
}
