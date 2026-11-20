package app.capynime.compose.ui.screens

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.boundsInWindow
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalWindowInfo
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.capynime.compose.data.AnimeRepository
import app.capynime.compose.data.Comment
import app.capynime.compose.data.Episode
import app.capynime.compose.data.Library
import app.capynime.compose.ui.LIcon
import app.capynime.compose.ui.LocalNav
import app.capynime.compose.ui.Lu
import app.capynime.compose.ui.common.LazyImage
import app.capynime.compose.ui.common.Skeleton
import app.capynime.compose.ui.common.friendly
import app.capynime.compose.ui.common.timeAgo
import app.capynime.compose.ui.glass.glassCard
import app.capynime.compose.ui.glass.glassField
import app.capynime.compose.ui.glass.glassPill
import app.capynime.compose.ui.glass.pressable
import app.capynime.compose.ui.glass.rounded
import app.capynime.compose.ui.theme.BeVietnam
import app.capynime.compose.ui.theme.Capy
import coil3.compose.AsyncImage
import app.capynime.compose.ui.glass.Capsule
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private class Thread(val filmId: Int) {
    val comments = mutableStateListOf<Comment>()
    var total by mutableIntStateOf(0)
    var offset = 0
    var hasMore by mutableStateOf(true)
    var loading by mutableStateOf(false)
    var loaded by mutableStateOf(false)
    var error by mutableStateOf<String?>(null)

    suspend fun more(reset: Boolean = false) {
        if (loading) return
        loading = true
        error = null
        try {
            val page = withContext(Dispatchers.Default) { AnimeRepository.comments(filmId, if (reset) 0 else offset) }
            if (reset) comments.clear()
            val seen = comments.mapTo(HashSet()) { it.id }
            comments.addAll(page.comments.filter { seen.add(it.id) })
            total = page.total
            offset = page.offset
            hasMore = page.hasMore
            loaded = true
        } catch (e: kotlinx.coroutines.CancellationException) {
            throw e
        } catch (e: Throwable) {
            error = friendly(e)
        } finally {
            loading = false
        }
    }
}

/** The PRIMARY button of the account pieces: white pill, black text, icon */
@Composable
fun PrimaryButton(text: String, icon: Int?, enabled: Boolean = true, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Row(
        modifier.height(40.dp).pressable(enabled = enabled, onClick = onClick).clip(Capsule())
            .background(if (enabled) Color.White else Color.White.copy(alpha = 0.5f)).padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (icon != null) LIcon(icon, Modifier.padding(end = 8.dp), size = 16.dp, tint = Color.Black)
        Text(text, color = Color.Black, fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
    }
}

/**
 * CommentSection.tsx: the title's AnimeVietsub thread, shared with the source site. Nothing is asked of the source
 * until it is composed (scrolled near); the next five load by themselves as the end comes into view.
 */
@Composable
fun CommentsSection(slug: String, episode: Episode?, modifier: Modifier = Modifier) {
    val filmId = remember(slug) { AnimeRepository.filmIdOf(slug) }
    if (filmId == 0) return
    val thread = remember(filmId) { Thread(filmId) }
    val scope = rememberCoroutineScope()
    LaunchedEffect(thread) { thread.more(reset = true) }
    val windowHeight = LocalWindowInfo.current.containerSize.height

    Column(modifier.fillMaxWidth().glassCard().padding(20.dp), verticalArrangement = Arrangement.spacedBy(24.dp)) {
        Row(verticalAlignment = Alignment.Bottom) {
            Text("Bình luận", color = Color.White, fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.Bold, letterSpacing = (-0.45).sp)
            if (thread.total > 0) Text(
                "%,d".format(thread.total).replace(',', '.'), color = Capy.TextDim, fontSize = 14.sp, lineHeight = 24.sp,
                fontWeight = FontWeight.Medium, modifier = Modifier.padding(start = 8.dp),
            )
        }
        Composer(filmId, episode) { scope.launch { thread.more(reset = true) } }
        if (!thread.loaded && thread.error == null) CommentsSkeleton()
        thread.error?.let {
            Text(
                buildAnnotatedString {
                    append("Chưa tải được bình luận. ")
                    withStyle(SpanStyle(color = Color.White, fontWeight = FontWeight.SemiBold)) { append("Thử lại") }
                },
                color = Capy.TextDim, fontSize = 14.sp, modifier = Modifier.pressable { scope.launch { thread.more(reset = !thread.loaded) } },
            )
        }
        if (thread.loaded && thread.comments.isEmpty()) Text("Chưa có bình luận nào. Hãy là người đầu tiên.", color = Capy.TextDim, fontSize = 14.sp)
        if (thread.comments.isNotEmpty()) Column {
            thread.comments.forEachIndexed { i, c ->
                if (i > 0) Divider()
                CommentItem(c, Modifier.padding(top = if (i == 0) 0.dp else 16.dp, bottom = if (i == thread.comments.lastIndex) 0.dp else 16.dp))
            }
        }
        if (thread.loaded && thread.hasMore) Box(
            Modifier.fillMaxWidth().padding(vertical = 8.dp).onGloballyPositioned { c ->
                if (!thread.loading && thread.error == null && c.boundsInWindow().top < windowHeight + 400) scope.launch { thread.more() }
            },
            contentAlignment = Alignment.Center,
        ) {
            if (thread.error != null) Box(Modifier.height(36.dp).pressable { scope.launch { thread.more() } }.glassPill().padding(horizontal = 20.dp), contentAlignment = Alignment.Center) {
                Text("Tải lại", color = Capy.Gray200, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            } else Row(verticalAlignment = Alignment.CenterVertically) {
                CircularProgressIndicator(Modifier.size(16.dp), color = Capy.TextDim, strokeWidth = 2.dp)
                Text("Đang tải thêm...", color = Capy.TextDim, fontSize = 14.sp, modifier = Modifier.padding(start = 8.dp))
            }
        }
    }
}

@Composable
private fun Divider() = Box(Modifier.fillMaxWidth().height(1.dp).background(Color.White.copy(alpha = 0.06f)))

@Composable
private fun CommentsSkeleton() {
    Column(verticalArrangement = Arrangement.spacedBy(20.dp)) {
        repeat(3) {
            Row {
                Skeleton(Modifier.size(40.dp), 20.dp)
                Column(Modifier.padding(start = 12.dp, top = 4.dp).weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Skeleton(Modifier.width(128.dp).height(12.dp))
                    Skeleton(Modifier.fillMaxWidth().height(12.dp))
                    Skeleton(Modifier.fillMaxWidth(0.66f).height(12.dp))
                }
            }
        }
    }
}

/** The comment box when signed in, a sign-in line otherwise (CommentComposer.tsx) */
@Composable
private fun Composer(filmId: Int, episode: Episode?, onPosted: () -> Unit) {
    val user by Library.user.collectAsState()
    val nav = LocalNav.current
    val u = user
    if (u == null) {
        Row(
            Modifier.fillMaxWidth().clip(rounded(8.dp)).background(Color.White.copy(alpha = 0.04f)).border(1.dp, Color.White.copy(alpha = 0.1f), rounded(8.dp))
                .padding(start = 16.dp, top = 12.dp, bottom = 12.dp, end = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            LIcon(Lu.MessageSquare, size = 20.dp, tint = Capy.TextDim)
            Text("Đăng nhập tài khoản AnimeVietsub để bình luận", color = Capy.Gray300, fontSize = 14.sp, lineHeight = 20.sp, modifier = Modifier.padding(horizontal = 12.dp).weight(1f))
            PrimaryButton("Đăng nhập", Lu.LogIn) { nav.login() }
        }
        return
    }
    var text by remember { mutableStateOf("") }
    var spoiler by remember { mutableStateOf(false) }
    var sending by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var notice by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    Row {
        Avatar(u.avatar)
        Column(Modifier.padding(start = 12.dp).weight(1f), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            BasicTextField(
                value = text,
                onValueChange = { if (it.length <= 2000) text = it },
                textStyle = TextStyle(color = Color.White, fontSize = 14.sp, lineHeight = 22.75.sp, fontFamily = BeVietnam),
                cursorBrush = SolidColor(Color.White),
                modifier = Modifier.fillMaxWidth().heightIn(min = 84.dp).glassField(rounded(8.dp)).padding(horizontal = 12.dp, vertical = 8.dp),
                decorationBox = { inner ->
                    if (text.isEmpty()) Text("Bình luận với tên ${u.name}...", color = Capy.TextFaint, fontSize = 14.sp)
                    inner()
                },
            )
            error?.let { Text(it, color = Color(0xFFF87171), fontSize = 12.sp) }
            notice?.let { Text(it, color = Capy.Amber400, fontSize = 12.sp) }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Row(
                    Modifier.height(32.dp).pressable { spoiler = !spoiler }
                        .then(
                            if (spoiler) Modifier.clip(Capsule()).background(Capy.Red.copy(alpha = 0.2f)).border(1.dp, Capy.Red.copy(alpha = 0.4f), Capsule())
                            else Modifier.glassPill(),
                        ).padding(horizontal = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    LIcon(Lu.Eye, size = 14.dp, tint = if (spoiler) Capy.Red else Capy.Gray300)
                    Text("Spoiler", color = if (spoiler) Capy.Red else Capy.Gray300, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(start = 6.dp))
                }
                Box(Modifier.weight(1f))
                PrimaryButton(if (sending) "Đang gửi..." else "Gửi", Lu.Send, enabled = !sending && text.isNotBlank()) {
                    scope.launch {
                        sending = true
                        error = null
                        notice = null
                        try {
                            val pending = AnimeRepository.postComment(filmId, text.trim(), spoiler, episode)
                            text = ""
                            spoiler = false
                            notice = if (pending) "Bình luận của bạn đang chờ duyệt." else null
                            onPosted()
                        } catch (e: Throwable) {
                            // the error shows under the box and the text stays for another try
                            error = friendly(e)
                            runCatching { Library.setUser(AnimeRepository.me()) }
                        } finally {
                            sending = false
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun Avatar(src: String, small: Boolean = false) {
    val s = if (small) 32.dp else 40.dp
    LazyImage(src, Modifier.size(s).clip(Capsule()).background(Color.White.copy(alpha = 0.1f)).border(1.dp, Color.White.copy(alpha = 0.15f), Capsule()))
}

private val CODES = Regex("@\\[\\d+:([^\\]]+)\\]|\\[sticker:(https://[^\\]\\s]+)\\]")

/** CommentItem.tsx: one comment, its replies loaded when opened */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun CommentItem(c: Comment, modifier: Modifier = Modifier, reply: Boolean = false) {
    var open by remember { mutableStateOf(false) }
    var reveal by remember { mutableStateOf(false) }
    val replies = remember { mutableStateListOf<Comment>() }
    var loading by remember { mutableStateOf(false) }
    var failed by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    Row(modifier) {
        Avatar(c.userAvatar, reply)
        Column(Modifier.padding(start = 12.dp).weight(1f)) {
            if (c.pinned) Row(Modifier.padding(bottom = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                LIcon(Lu.Pin, size = 12.dp, tint = Capy.Red)
                Text("GHIM", color = Capy.Red, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 0.55.sp, modifier = Modifier.padding(start = 4.dp))
            }
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(4.dp), itemVerticalAlignment = Alignment.CenterVertically) {
                Text(c.userName, color = Color.White, fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold)
                c.badges.forEach { (name, color) ->
                    Text(
                        name.uppercase(), color = Color.White, fontSize = 10.sp, lineHeight = 15.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.25.sp,
                        modifier = Modifier.clip(rounded(6.dp)).background(parseColor(color)).padding(horizontal = 6.dp, vertical = 1.dp),
                    )
                }
                if (c.episodeTag.isNotEmpty()) Text(
                    c.episodeTag, color = Capy.Gray200, fontSize = 10.sp, lineHeight = 15.sp, fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.glassPill().padding(horizontal = 8.dp, vertical = 1.dp),
                )
                Text(timeAgo(c.createdAt), color = Capy.TextFaint, fontSize = 12.sp, lineHeight = 16.sp)
            }
            Box(Modifier.padding(top = 6.dp)) {
                when {
                    c.banned -> Text("Bình luận của thành viên bị khoá.", color = Capy.TextFaint, fontSize = 14.sp, fontStyle = FontStyle.Italic)
                    c.spoiler && !reveal -> Text(
                        "Có spoiler · nhấn để xem", color = Capy.Gray300, fontSize = 12.sp, fontWeight = FontWeight.Medium,
                        modifier = Modifier.pressable { reveal = true }.glassPill(rounded(8.dp)).padding(horizontal = 12.dp, vertical = 8.dp),
                    )
                    else -> CommentText(c.content)
                }
            }
            Row(Modifier.padding(top = 8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    LIcon(Lu.ThumbsUp, size = 14.dp, tint = Capy.TextFaint, label = "Thích")
                    Text("${c.votesUp}", color = Capy.TextFaint, fontSize = 12.sp, modifier = Modifier.padding(start = 4.dp))
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    LIcon(Lu.ThumbsDown, size = 14.dp, tint = Capy.TextFaint, label = "Không thích")
                    Text("${c.votesDown}", color = Capy.TextFaint, fontSize = 12.sp, modifier = Modifier.padding(start = 4.dp))
                }
                if (!reply && c.repliesCount > 0) Row(
                    Modifier.pressable {
                        open = !open
                        if (open && replies.isEmpty()) scope.launch {
                            loading = true
                            failed = false
                            runCatching { replies.addAll(AnimeRepository.replies(c.id)) }.onFailure { failed = true }
                            loading = false
                        }
                    },
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    LIcon(Lu.MessageSquare, size = 14.dp, tint = Capy.Gray300)
                    Text(if (open) "Ẩn trả lời" else "${c.repliesCount} trả lời", color = Capy.Gray300, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(horizontal = 4.dp))
                    val turn by animateFloatAsState(if (open) 180f else 0f, label = "chev")
                    LIcon(Lu.ChevronDown, Modifier.rotate(turn), size = 14.dp, tint = Capy.Gray300)
                }
            }
            if (open) Column(
                Modifier.padding(top = 8.dp).drawBehind { drawLine(Color.White.copy(alpha = 0.1f), Offset(1.dp.toPx(), 0f), Offset(1.dp.toPx(), size.height), 2.dp.toPx()) }
                    .padding(start = 16.dp),
            ) {
                if (loading) Text("Đang tải trả lời...", color = Capy.TextFaint, fontSize = 12.sp, modifier = Modifier.padding(vertical = 12.dp))
                if (failed) Text("Chưa tải được trả lời.", color = Color(0xFFF87171), fontSize = 12.sp, modifier = Modifier.padding(vertical = 12.dp))
                replies.forEachIndexed { i, r ->
                    if (i > 0) Divider()
                    CommentItem(r, Modifier.padding(vertical = 12.dp), reply = true)
                }
            }
        }
    }
}

/** Plain text with the source's @[id:name] mentions and [sticker:url] images (CommentText.tsx) */
@Composable
private fun CommentText(text: String) {
    Column {
        var last = 0
        val parts = mutableListOf<Pair<String?, String?>>() // text, sticker
        CODES.findAll(text).forEach { m ->
            parts += text.substring(last, m.range.first) to null
            m.groups[1]?.value?.let { parts += "\u0000@$it" to null }
            m.groups[2]?.value?.let { parts += null to it }
            last = m.range.last + 1
        }
        parts += text.substring(last) to null
        // runs of text between stickers become one paragraph each
        val runs = mutableListOf<Any>()
        var current = buildAnnotatedString { }
        for ((t, sticker) in parts) {
            if (sticker != null) {
                if (current.isNotBlank()) runs += current
                current = buildAnnotatedString { }
                runs += sticker
            } else if (t != null) current = buildAnnotatedString {
                append(current)
                if (t.startsWith("\u0000")) withStyle(SpanStyle(color = Color.White, fontWeight = FontWeight.SemiBold)) { append(t.drop(1)) } else append(t)
            }
        }
        if (current.isNotBlank()) runs += current
        runs.forEach { r ->
            if (r is String) AsyncImage(r, "sticker", Modifier.padding(vertical = 6.dp).size(80.dp), contentScale = ContentScale.Fit)
            else Text(r as androidx.compose.ui.text.AnnotatedString, color = Capy.Gray200, fontSize = 14.sp, lineHeight = 22.75.sp)
        }
    }
}

private fun parseColor(hex: String): Color = runCatching { Color(android.graphics.Color.parseColor(hex)) }.getOrDefault(Capy.Red)
