package app.capynime.compose.ui.screens

import app.capynime.compose.ui.common.smoothListState
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.key
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.capynime.compose.data.AnimeRepository
import app.capynime.compose.data.AccountRepository
import app.capynime.compose.data.Library
import app.capynime.compose.data.Notice
import app.capynime.compose.ui.LIcon
import app.capynime.compose.ui.LocalNav
import app.capynime.compose.ui.Lu
import app.capynime.compose.ui.common.LazyImage
import app.capynime.compose.ui.common.Load
import app.capynime.compose.ui.common.Skeleton
import app.capynime.compose.ui.common.friendly
import app.capynime.compose.ui.common.rememberLoad
import app.capynime.compose.ui.common.timeAgo
import app.capynime.compose.ui.dockPadding
import app.capynime.compose.ui.glass.glassCard
import app.capynime.compose.ui.glass.glassField
import app.capynime.compose.ui.glass.glassPill
import app.capynime.compose.ui.glass.pressable
import app.capynime.compose.ui.glass.rounded
import app.capynime.compose.ui.theme.BeVietnam
import app.capynime.compose.ui.theme.Capy
import app.capynime.compose.ui.glass.Capsule
import kotlinx.coroutines.launch
import kotlinx.coroutines.CancellationException

/** LoginDialog (AccountButton.tsx) + LoginForm.tsx: AnimeVietsub email/username and password */
@Composable
fun LoginDialog(onClose: () -> Unit) {
    var email by rememberSaveable { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var pending by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    BackHandler(onBack = onClose)
    val submit = {
        if (email.isNotBlank() && password.isNotEmpty() && !pending) scope.launch {
            pending = true
            error = null
            try {
                Library.setUser(AnimeRepository.login(email.trim(), password))
                onClose()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                error = friendly(e)
            } finally {
                pending = false
            }
        }
    }
    Box(
        Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.7f)).clickable(remember { MutableInteractionSource() }, indication = null, onClick = onClose).imePadding(),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            Modifier.padding(16.dp).widthIn(max = 448.dp).fillMaxWidth()
                .clickable(remember { MutableInteractionSource() }, indication = null) {}
                .clip(rounded(12.dp))
                .background(Brush.linearGradient(listOf(Color(40, 40, 52).copy(alpha = 0.97f), Color(14, 14, 20).copy(alpha = 0.98f))))
                .border(1.dp, Color.White.copy(alpha = 0.1f), rounded(12.dp))
                .padding(24.dp),
        ) {
            Row(Modifier.padding(bottom = 20.dp)) {
                Column(Modifier.weight(1f)) {
                    Text("Đăng nhập", color = Color.White, fontSize = 24.sp, lineHeight = 32.sp, fontWeight = FontWeight.Bold, letterSpacing = (-0.6).sp)
                    Text("Dùng tài khoản AnimeVietsub để bình luận và đồng bộ.", color = Capy.TextDim, fontSize = 14.sp, lineHeight = 20.sp, modifier = Modifier.padding(top = 4.dp))
                }
                Box(Modifier.padding(start = 16.dp).size(36.dp).pressable(onClick = onClose).glassPill(), contentAlignment = Alignment.Center) {
                    LIcon(Lu.X, size = 16.dp, tint = Capy.Gray200, label = "Đóng")
                }
            }
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Field(email, { email = it }, "Email hoặc tên đăng nhập", enabled = !pending)
                Field(password, { password = it }, "Mật khẩu", password = true, enabled = !pending)
                error?.let { Text(it, color = Color(0xFFF87171), fontSize = 12.sp) }
                Row(Modifier.fillMaxWidth().padding(top = 4.dp), horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.End)) {
                    Box(Modifier.height(40.dp).pressable(enabled = !pending, onClick = onClose).glassPill().padding(horizontal = 16.dp), contentAlignment = Alignment.Center) {
                        Text("Huỷ", color = Capy.Gray200, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                    }
                    PrimaryButton(if (pending) "Đang đăng nhập..." else "Đăng nhập", Lu.LogIn, enabled = !pending) { submit() }
                }
                Text(
                    "APK hiện đăng nhập bằng email hoặc tên đăng nhập và mật khẩu AnimeVietsub. Nguồn chưa cung cấp luồng Google chuyển phiên vào ứng dụng; Chrome và APK dùng kho phiên riêng.",
                    color = Capy.TextFaint, fontSize = 12.sp, lineHeight = 19.5.sp,
                )
            }
        }
    }
}

/** FIELD: glass-field rounded-2xl px-4 py-2.5 text-sm */
@Composable
internal fun Field(value: String, onChange: (String) -> Unit, hint: String, password: Boolean = false, enabled: Boolean = true, multiline: Boolean = false) {
    BasicTextField(
        value, onChange,
        Modifier.fillMaxWidth().semantics { contentDescription = hint }.glassField(rounded(8.dp)).padding(horizontal = 16.dp, vertical = 12.dp),
        enabled = enabled,
        singleLine = !multiline,
        minLines = if (multiline) 3 else 1,
        textStyle = TextStyle(color = Color.White, fontSize = 14.sp, fontFamily = BeVietnam),
        cursorBrush = SolidColor(Color.White),
        visualTransformation = if (password) PasswordVisualTransformation() else VisualTransformation.None,
        keyboardOptions = KeyboardOptions(keyboardType = if (password) KeyboardType.Password else KeyboardType.Text),
        decorationBox = { inner ->
            if (value.isEmpty()) Text(hint, color = Capy.TextFaint, fontSize = 14.sp)
            inner()
        },
    )
}

private val TABS = listOf(Triple("hoso", "Hồ sơ", Lu.UserRound), Triple("taikhoan", "Tài khoản", Lu.Lock), Triple("binhluan", "Bình luận", Lu.MessageSquare), Triple("thongbao", "Thông báo", Lu.Bell))

/** AccountPage.tsx: the viewer's AnimeVietsub account, the same four tabs as the source's own page */
@Composable
fun AccountScreen(initialTab: String) {
    val user by Library.user.collectAsState()
    val nav = LocalNav.current
    val scope = rememberCoroutineScope()
    var tab by rememberSaveable { mutableStateOf(initialTab.ifEmpty { "hoso" }) }
    var loggingOut by remember(user?.id) { mutableStateOf(false) }
    var logoutError by remember(user?.id) { mutableStateOf<String?>(null) }
    LaunchedEffect(user?.id) {
        val expected = user?.id ?: return@LaunchedEffect
        try {
            val current = AnimeRepository.me()
            if (Library.user.value?.id == expected) Library.setUser(current)
        } catch (e: CancellationException) { throw e }
        catch (_: Exception) { /* Preserve the local identity during a temporary network failure. */ }
    }
    val logout = { scope.launch {
        val expected = user?.id
        if (!loggingOut && expected != null) {
            loggingOut = true; logoutError = null
            try {
                AnimeRepository.logout()
                if (Library.user.value?.id == expected) Library.setUser(null)
            } catch (e: CancellationException) { throw e }
            catch (e: Exception) { logoutError = friendly(e) }
            finally { loggingOut = false }
        }
    } }

    val u = user
    if (u == null) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 64.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Text("Chưa đăng nhập", color = Color.White, fontSize = 24.sp, fontWeight = FontWeight.Bold)
            Text("Đăng nhập tài khoản AnimeVietsub để xem và sửa hồ sơ, bình luận, thông báo.", color = Capy.TextDim, fontSize = 14.sp, textAlign = TextAlign.Center)
            PrimaryButton("Đăng nhập", Lu.LogIn) { nav.login() }
        }
        return
    }
    val notices = rememberLoad("notifications:${u.id}", staleMs = 60_000) { AccountRepository.notifications(u.id) }
    val unread = (notices.value as? Load.Ok)?.value?.count { !it.read } ?: 0

    LazyColumn(state = smoothListState(), contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 16.dp, bottom = dockPadding() + 24.dp), verticalArrangement = Arrangement.spacedBy(24.dp)) {
        item("card") {
            Box(Modifier.fillMaxWidth().glassCard().background(Brush.horizontalGradient(listOf(Capy.Red.copy(alpha = 0.45f), Capy.Red.copy(alpha = 0.1f), Color.Transparent))).padding(20.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    LazyImage(u.avatar, Modifier.size(80.dp).clip(Capsule()).border(4.dp, Color.White.copy(alpha = 0.8f), Capsule()))
                    Column(Modifier.padding(start = 16.dp).weight(1f)) {
                        Text(u.name, color = Color.White, fontSize = 24.sp, lineHeight = 32.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text("ID ${u.id}", color = Capy.Gray300, fontSize = 14.sp, modifier = Modifier.padding(top = 4.dp))
                    }
                }
            }
        }
        item("tabs") {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(TABS, key = { it.first }) { (id, label, icon) ->
                    val selected = tab == id
                    Row(
                        Modifier.height(40.dp).pressable(pressedScale = 0.95f) { tab = id }
                            .then(if (selected) Modifier.clip(Capsule()).background(Color.White) else Modifier.glassPill()).padding(horizontal = 16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        LIcon(icon, size = 16.dp, tint = if (selected) Color.Black else Capy.Gray200)
                        Text(label, color = if (selected) Color.Black else Capy.Gray200, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(start = 8.dp))
                        if (id == "thongbao" && unread > 0) Text(
                            "$unread", color = Color.White, fontSize = 11.sp, lineHeight = 20.sp,
                            modifier = Modifier.padding(start = 6.dp).clip(Capsule()).background(Capy.Red).padding(horizontal = 6.dp),
                        )
                    }
                }
            }
        }
        item("body") {
            Column(Modifier.fillMaxWidth().glassCard().padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                when (tab) {
                    "hoso", "taikhoan", "binhluan" -> key(u.id) { NativeAccountBody(u.id, tab) }
                    else -> Notifications(notices.value)
                }
            }
        }
        item("logout") {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            logoutError?.let { Text(it, color = Color(0xFFF87171), fontSize = 13.sp) }
            Row(
                Modifier.fillMaxWidth().height(40.dp).pressable(enabled = !loggingOut) { logout() }.glassPill(),
                horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically,
            ) {
                LIcon(Lu.LogOut, size = 16.dp, tint = Color(0xFFFCA5A5))
                Text(if (loggingOut) "Đang đăng xuất..." else "Đăng xuất", color = Color(0xFFFCA5A5), fontSize = 14.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(start = 8.dp))
            }
            }
        }
    }
    LaunchedEffect(u.id, tab, unread) {
        if (tab == "thongbao" && unread > 0) {
            try {
                AccountRepository.markNotificationsRead(u.id)
                notices.retry()
            } catch (e: CancellationException) { throw e }
            catch (_: Exception) { /* Keep unread markers when the source did not confirm the update. */ }
        }
    }
}

@Composable
private fun Notifications(state: Load<List<Notice>>) {
    val nav = LocalNav.current
    when (state) {
        is Load.Loading -> repeat(3) { Skeleton(Modifier.fillMaxWidth().height(56.dp), 8.dp) }
        is Load.Failed -> Text(state.message, color = Capy.TextDim, fontSize = 14.sp)
        is Load.Ok -> if (state.value.isEmpty()) Text("Không có thông báo nào.", color = Capy.TextDim, fontSize = 14.sp)
        else state.value.forEach { n ->
            Row(
                Modifier.fillMaxWidth().clip(rounded(8.dp)).background(Color.White.copy(alpha = if (n.read) 0.03f else 0.08f))
                    .pressable { n.slug?.let { nav.watch(it) } }.padding(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(Modifier.weight(1f)) {
                    Text(n.text, color = Color.White, fontSize = 14.sp)
                    Text(timeAgo(n.createdAt), color = Capy.TextFaint, fontSize = 12.sp)
                }
                if (!n.read) Box(Modifier.size(8.dp).clip(Capsule()).background(Capy.Red))
            }
        }
    }
}

