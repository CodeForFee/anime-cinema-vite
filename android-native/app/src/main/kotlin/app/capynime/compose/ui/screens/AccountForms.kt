package app.capynime.compose.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.capynime.compose.data.AccountInfo
import app.capynime.compose.data.AccountRepository
import app.capynime.compose.data.Library
import app.capynime.compose.data.OwnComment
import app.capynime.compose.data.sourceUrl
import app.capynime.compose.ui.LocalNav
import app.capynime.compose.ui.Lu
import app.capynime.compose.ui.common.friendly
import app.capynime.compose.ui.common.timeAgo
import app.capynime.compose.ui.glass.glassPill
import app.capynime.compose.ui.glass.pressable
import app.capynime.compose.ui.glass.rounded
import app.capynime.compose.ui.theme.Capy
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch

@Composable
fun NativeAccountBody(userId: Int, tab: String) {
    var info by remember(userId) { mutableStateOf<AccountInfo?>(null) }
    var error by remember(userId) { mutableStateOf<String?>(null) }
    var revision by remember(userId) { mutableStateOf(0) }
    var loading by remember(userId) { mutableStateOf(true) }
    val context = LocalContext.current
    LaunchedEffect(userId, revision) {
        loading = true; error = null
        try {
            val answer = AccountRepository.info(userId)
            if (Library.user.value?.id == userId) {
                if (answer == null) Library.setUser(null)
                else {
                    info = answer
                    Library.user.value?.let { user ->
                        Library.setUser(user.copy(name = answer.name.ifEmpty { user.name }, avatar = answer.avatar.ifEmpty { user.avatar }))
                    }
                }
            }
        } catch (e: CancellationException) { throw e }
        catch (e: Exception) { error = friendly(e) }
        finally { loading = false }
    }
    when {
        tab == "binhluan" -> AccountComments(userId)
        info != null -> {
            PrimaryButton(if (loading) "Đang tải..." else "Tải lại hồ sơ", null, enabled = !loading) { revision++ }
            if (tab == "hoso") AccountProfileForm(userId, info!!, onSaved = { revision++ }) {
                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(sourceUrl("/account/info/?tab=hoso"))))
            } else AccountSettingsForm(userId, info!!) { revision++ }
            error?.let { Text(it, color = Color(0xFFF87171), fontSize = 13.sp) }
        }
        loading -> Text("Đang tải tài khoản...", color = Capy.TextDim, fontSize = 14.sp)
        else -> {
            Text(error ?: "Không tải được tài khoản.", color = Capy.TextDim, fontSize = 14.sp)
            PrimaryButton("Thử lại", null) { revision++ }
        }
    }
}

@Composable
private fun FormLabel(text: String) = Text(text, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)

@Composable
private fun Choice(label: String, selected: Boolean, enabled: Boolean = true, onClick: () -> Unit) {
    Row(
        Modifier.height(40.dp).pressable(enabled = enabled, onClick = onClick)
            .then(if (selected) Modifier.background(Color.White, rounded(20.dp)) else Modifier.glassPill())
            .padding(horizontal = 14.dp), verticalAlignment = Alignment.CenterVertically,
    ) { Text(label, color = if (selected) Color.Black else Capy.Gray300, fontSize = 12.sp, fontWeight = FontWeight.SemiBold) }
}

/** Same profile fields as the web; the source remains authoritative after every save. */
@Composable
fun AccountProfileForm(userId: Int, info: AccountInfo, onSaved: () -> Unit, onAvatar: () -> Unit) {
    var form by remember(info) { mutableStateOf(info.profile) }
    var pending by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var saved by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(info.handle, color = Capy.Gray300, fontSize = 14.sp)
        if (info.joined.isNotEmpty()) Text(info.joined, color = Capy.TextFaint, fontSize = 12.sp)
        PrimaryButton("Đổi ảnh đại diện", Lu.ExternalLink, enabled = !pending, onClick = onAvatar)
        Text("Tải ảnh ở AnimeVietsub, rồi tải lại hồ sơ để cập nhật.", color = Capy.TextFaint, fontSize = 12.sp)
        FormLabel("Tên hiển thị")
        Field(form.fullname, { form = form.copy(fullname = it.take(50)); saved = false }, "Để trống để dùng @username", enabled = !pending)
        FormLabel("Giới tính")
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("1" to "Nam", "0" to "Nữ", "2" to "Không xác định").forEach { (value, label) ->
                Choice(label, form.gender == value, !pending) { form = form.copy(gender = value); saved = false }
            }
        }
        FormLabel("Giới thiệu (${form.bio.length}/280)")
        Field(form.bio, { form = form.copy(bio = it.take(280)); saved = false }, "Vài dòng về bạn", enabled = !pending, multiline = true)
        FormLabel("Mạng xã hội")
        AccountRepository.socials.forEach { (key, label) ->
            Field(form.social[key].orEmpty(), { form = form.copy(social = form.social + (key to it)); saved = false }, label, enabled = !pending)
        }
        FormLabel("Thể loại yêu thích (${form.genres.size}/10)")
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            info.genres.forEach { genre ->
                val selected = genre.id in form.genres
                Choice(genre.name, selected, !pending && (selected || form.genres.size < 10)) {
                    form = form.copy(genres = if (selected) form.genres - genre.id else form.genres + genre.id)
                    saved = false
                }
            }
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            Checkbox(
                checked = form.isPrivate, onCheckedChange = { form = form.copy(isPrivate = it); saved = false }, enabled = !pending,
                colors = CheckboxDefaults.colors(checkedColor = Capy.Red, uncheckedColor = Capy.Gray300, checkmarkColor = Color.White),
            )
            Column {
                FormLabel("Khoá trang cá nhân")
                Text("Chỉ bạn và quản trị viên thấy hồ sơ đầy đủ.", color = Capy.TextFaint, fontSize = 12.sp)
            }
        }
        error?.let { Text(it, color = Color(0xFFF87171), fontSize = 13.sp) }
        if (saved) Text("Đã lưu hồ sơ", color = Color(0xFF6EE7B7), fontSize = 13.sp)
        PrimaryButton(if (pending) "Đang lưu..." else "Lưu hồ sơ", Lu.Check, enabled = !pending) {
            scope.launch {
                pending = true; error = null; saved = false
                try {
                    AccountRepository.updateProfile(userId, form)
                    if (Library.user.value?.id == userId) { saved = true; onSaved() }
                } catch (e: CancellationException) { throw e }
                catch (e: Exception) { error = friendly(e) }
                finally { pending = false }
            }
        }
    }
}

/** Account changes stay inside the app; passwords live only in this composition and are cleared on success/close. */
@Composable
fun AccountSettingsForm(userId: Int, info: AccountInfo, onSaved: () -> Unit) {
    var open by remember { mutableStateOf<String?>(null) }
    var email by remember { mutableStateOf("") }
    var emailPassword by remember { mutableStateOf("") }
    var username by remember { mutableStateOf("") }
    var current by remember { mutableStateOf("") }
    var next by remember { mutableStateOf("") }
    var confirm by remember { mutableStateOf("") }
    var pending by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var notice by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    fun clear() { email = ""; emailPassword = ""; username = ""; current = ""; next = ""; confirm = ""; error = null }
    fun toggle(id: String) { clear(); notice = null; open = if (open == id) null else id }
    fun submit(kind: String) {
        scope.launch {
            pending = true; error = null; notice = null
            try {
                when (kind) {
                    "email" -> AccountRepository.changeEmail(userId, email, emailPassword, info.emailNeedsPassword)
                    "username" -> AccountRepository.changeUsername(userId, username)
                    else -> AccountRepository.changePassword(userId, next, confirm, current, info.passwordMode == "set")
                }
                if (Library.user.value?.id == userId) {
                    clear(); open = null
                    notice = when (kind) {
                        "email" -> "Đã gửi link xác minh tới email hiện tại."
                        "username" -> "Đã đổi username."
                        else -> "Đã lưu mật khẩu."
                    }
                    onSaved()
                }
            } catch (e: CancellationException) { throw e }
            catch (e: Exception) { error = friendly(e) }
            finally { pending = false }
        }
    }
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        FormLabel("Email")
        Text(info.email + if (info.emailVerified) " · Đã xác minh" else "", color = Capy.Gray300, fontSize = 14.sp)
        PrimaryButton(if (open == "email") "Huỷ" else "Đổi email", Lu.ExternalLink, enabled = !pending) { toggle("email") }
        if (open == "email") {
            Text("Link xác nhận sẽ gửi tới email hiện tại trước khi đổi.", color = Capy.TextFaint, fontSize = 12.sp)
            Field(email, { email = it }, "Email mới", enabled = !pending)
            if (info.emailNeedsPassword) Field(emailPassword, { emailPassword = it }, "Mật khẩu", password = true, enabled = !pending)
        }
        FormLabel("Username")
        Text("@${info.username}", color = Capy.Gray300, fontSize = 14.sp)
        PrimaryButton(if (open == "username") "Huỷ" else "Đổi username", Lu.UserRound, enabled = !pending && !info.usernameLocked) { toggle("username") }
        if (info.usernameLocked) Text("Nguồn đang khoá đổi username. Chỉ đổi được mỗi 30 ngày.", color = Capy.TextFaint, fontSize = 12.sp)
        if (open == "username") {
            Text("Chỉ đổi được mỗi 30 ngày một lần.", color = Capy.TextFaint, fontSize = 12.sp)
            Field(username, { username = it.take(20) }, "Username mới (3–20 chữ, số hoặc _)", enabled = !pending)
        }
        FormLabel("Mật khẩu")
        Text(info.passwordNote.ifEmpty { "••••••••" }, color = Capy.Gray300, fontSize = 14.sp)
        PrimaryButton(if (open == "password") "Huỷ" else if (info.passwordMode == "set") "Đặt mật khẩu" else "Đổi mật khẩu", Lu.Lock, enabled = !pending) { toggle("password") }
        if (open == "password") {
            if (info.passwordMode == "set") Text("Đặt mật khẩu để đăng nhập bằng email trên ứng dụng.", color = Capy.TextFaint, fontSize = 12.sp)
            else Field(current, { current = it }, "Mật khẩu hiện tại", password = true, enabled = !pending)
            Field(next, { next = it }, "Mật khẩu mới (ít nhất 6 ký tự)", password = true, enabled = !pending)
            Field(confirm, { confirm = it }, "Nhập lại mật khẩu mới", password = true, enabled = !pending)
        }
        error?.let { Text(it, color = Color(0xFFF87171), fontSize = 13.sp) }
        notice?.let { Text(it, color = Color(0xFF6EE7B7), fontSize = 13.sp) }
        open?.let { kind -> PrimaryButton(if (pending) "Đang xử lý..." else "Xác nhận", Lu.Check, enabled = !pending) { submit(kind) } }
    }
}

@Composable
fun AccountComments(userId: Int) {
    var comments by remember(userId) { mutableStateOf<List<OwnComment>>(emptyList()) }
    var offset by remember(userId) { mutableStateOf(0) }
    var more by remember(userId) { mutableStateOf(true) }
    var loaded by remember(userId) { mutableStateOf(false) }
    var pending by remember(userId) { mutableStateOf(false) }
    var error by remember(userId) { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val nav = LocalNav.current
    suspend fun load() {
        if (pending || !more) return
        pending = true; error = null
        try {
            val page = AccountRepository.comments(userId, offset)
            comments = (comments + page.comments).distinctBy { it.id }
            // A broken source cursor must not create an endless sequence of duplicate requests.
            more = page.hasMore && page.offset > offset
            offset = page.offset; loaded = true
        } catch (e: CancellationException) { throw e }
        catch (e: Exception) { error = friendly(e) }
        finally { pending = false }
    }
    LaunchedEffect(userId) { load() }
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        if (loaded && comments.isEmpty()) Text("Bạn chưa có bình luận nào.", color = Capy.TextDim, fontSize = 14.sp)
        comments.forEach { comment ->
            Column(Modifier.fillMaxWidth().background(Color.White.copy(alpha = 0.04f), rounded(8.dp)).padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(comment.title, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.then(if (comment.slug != null) Modifier.pressable { nav.watch(comment.slug) } else Modifier))
                Text(listOfNotNull(comment.episode.takeIf { it.isNotEmpty() }?.let { "Tập $it" }, timeAgo(comment.createdAt)).joinToString(" · "), color = Capy.TextFaint, fontSize = 12.sp)
                Text(if (comment.hidden) "Bình luận đã bị ẩn${comment.hideReason.takeIf { it.isNotBlank() }?.let { ": $it" }.orEmpty()}" else comment.content,
                    color = if (comment.hidden) Color(0xFFFCA5A5) else Capy.Gray200, fontSize = 14.sp)
                if (comment.pending) Text("Chờ duyệt", color = Color(0xFFFBBF24), fontSize = 12.sp)
            }
        }
        error?.let { Text(it, color = Color(0xFFF87171), fontSize = 13.sp) }
        if (more) PrimaryButton(if (pending) "Đang tải..." else if (error != null) "Thử lại" else "Tải thêm bình luận", null, enabled = !pending) { scope.launch { load() } }
    }
}
