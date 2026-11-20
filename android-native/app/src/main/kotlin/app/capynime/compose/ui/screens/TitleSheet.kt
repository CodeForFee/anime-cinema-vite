package app.capynime.compose.ui.screens

import app.capynime.compose.ui.common.row
import app.capynime.compose.ui.common.Device
import app.capynime.compose.ui.common.smoothListState
import android.annotation.SuppressLint
import android.webkit.WebChromeClient
import android.webkit.WebView
import androidx.activity.compose.BackHandler
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectVerticalDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import app.capynime.compose.data.AnimeDetail
import app.capynime.compose.data.AnimeItem
import app.capynime.compose.data.AnimeRepository
import app.capynime.compose.data.Episode
import app.capynime.compose.data.Library
import app.capynime.compose.ui.FIcon
import app.capynime.compose.ui.LIcon
import app.capynime.compose.ui.LocalNav
import app.capynime.compose.ui.Lu
import app.capynime.compose.ui.LuFilled
import app.capynime.compose.ui.common.LazyImage
import app.capynime.compose.ui.common.Load
import app.capynime.compose.ui.common.Skeleton
import app.capynime.compose.ui.common.rememberLoad
import app.capynime.compose.ui.glass.glassPill
import app.capynime.compose.ui.glass.pressable
import app.capynime.compose.ui.glass.rounded
import app.capynime.compose.ui.glass.Capsule
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.json.JSONObject

private val SheetBg = Color(0xFF181818)
private val Muted = Color(0xFF777777)
private val Soft = Color(0xFFBCBCBC)
private val Line = Color(0xFF404040)
private val Box808 = Color(0xFF808080)
private val Match = Color(0xFF46D369)
private const val CHUNK = 50

/** The facts row values the web reads from detail.metadata */
private fun AnimeDetail.fact(key: String) = facts.firstOrNull { it.first == key }?.second.orEmpty()

/**
 * Mobile TitleSheet + TitleBody (use-title-detail.ts): the title preview as a full-height sheet over everything;
 * pulling its picture down closes it, Android back too.
 */
@Composable
fun TitleSheet(item: AnimeItem, onDismiss: () -> Unit) {
    val nav = LocalNav.current
    val scope = rememberCoroutineScope()
    val slide = remember(item.slug) { Animatable(1f) }
    var height by remember { mutableIntStateOf(2000) }
    LaunchedEffect(item.slug) { slide.animateTo(0f, tween(380, easing = EaseIos)) }
    val close: (() -> Unit) -> Unit = { then ->
        scope.launch {
            slide.animateTo(1f, tween(280, easing = EaseIos))
            onDismiss()
            then()
        }
    }
    BackHandler { close {} }

    val detailLoad = rememberLoad("detail:${item.slug}", staleMs = 10 * 60_000) { AnimeRepository.detail(item.slug) }
    val detail = (detailLoad.value as? Load.Ok)?.value
    var seasonSlug by remember(item.slug) { mutableStateOf<String?>(null) }
    val seasonLoad = seasonSlug?.let { s -> rememberLoad("detail:$s", staleMs = 10 * 60_000) { AnimeRepository.detail(s) } }
    val list = smoothListState()
    LaunchedEffect(item.slug) { list.scrollToItem(0) }

    Box(
        Modifier.fillMaxSize()
            .graphicsLayer { translationY = slide.value * height }
            .onSizeChanged { height = it.height }
            .background(SheetBg)
            .statusBarsPadding(),
    ) {
        LazyColumn(state = list, modifier = Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 32.dp)) {
            item("hero") {
                TitleHero(item, detail, onClose = { close {} }, onDrag = { dy ->
                    scope.launch { slide.snapTo((slide.value + dy / height).coerceAtLeast(0f)) }
                }, onDragEnd = {
                    if (slide.value > 0.18f) close {} else scope.launch { slide.animateTo(0f, tween(260, easing = EaseIos)) }
                }) { close { nav.watch(item.slug) } }
            }
            item("facts") { Facts(item, detail, Modifier.padding(start = 16.dp, end = 16.dp, top = 20.dp)) }
            val source = if (seasonSlug != null) (seasonLoad?.value as? Load.Ok)?.value else detail
            val episodes = source?.episodes.orEmpty()
            item("ep-head") {
                EpisodesHead(
                    detail, seasonSlug ?: item.slug, episodes.size, loading = detail == null && detailLoad.value is Load.Loading,
                    onSeason = { seasonSlug = if (it == item.slug) null else it },
                ) { chunk -> ChunkState.set(item.slug, chunk) }
            }
            val chunks = (episodes.size + CHUNK - 1) / CHUNK
            val chunk = ChunkState.get(item.slug).takeIf { it in 0 until chunks } ?: (chunks - 1).coerceAtLeast(0)
            val shown = if (chunks > 1) episodes.subList(chunk * CHUNK, minOf(episodes.size, (chunk + 1) * CHUNK)) else episodes
            val thumb = (if (seasonSlug != null) source?.backdrop else null) ?: detail?.backdrop ?: item.backdrop
            if (detail == null && detailLoad.value is Load.Loading) item("ep-skel") { EpisodeRowsSkeleton(3) }
            else if (seasonSlug != null && source == null) item("ep-skel2") { EpisodeRowsSkeleton(4) }
            else if (episodes.isEmpty() && (detail?.seasons?.size ?: 0) > 1) item("ep-none") {
                Text("Phần này chưa có tập nào.", color = Color(0xFFA3A3A3), fontSize = 14.sp, modifier = Modifier.fillMaxWidth().padding(vertical = 48.dp), textAlign = androidx.compose.ui.text.style.TextAlign.Center)
            }
            itemsIndexed(shown, key = { i, ep -> ep.id.ifEmpty { "$i" } }) { _, ep ->
                EpisodeRow(ep, thumb, Modifier.padding(horizontal = 16.dp)) { close { nav.watch(seasonSlug ?: item.slug, ep.id) } }
            }
            detail?.related?.takeIf { it.isNotEmpty() }?.let { related ->
                item("related") { Related(related, item.poster, Modifier.padding(start = 16.dp, end = 16.dp, top = 24.dp)) { nav.openTitle(it) } }
            }
            item("about") { About(item, detail, Modifier.padding(start = 16.dp, end = 16.dp, top = 24.dp)) }
            item("comments") { CommentsSection(item.slug, null, Modifier.padding(start = 16.dp, end = 16.dp, top = 24.dp).navigationBarsPadding()) }
        }
    }
}

/** The episode range picked per title (the newest chunk until one is picked) */
private object ChunkState {
    private val picked = androidx.compose.runtime.mutableStateMapOf<String, Int>()
    fun get(slug: String) = picked[slug] ?: -1
    fun set(slug: String, chunk: Int) { picked[slug] = chunk }
}

/** TitleHero.tsx: the muted trailer (or backdrop), title and the play / list / like buttons */
@Composable
private fun TitleHero(item: AnimeItem, detail: AnimeDetail?, onClose: () -> Unit, onDrag: (Float) -> Unit, onDragEnd: () -> Unit, onPlay: () -> Unit) {
    val favorites by Library.favorites.collectAsState()
    val isFavorite = favorites.any { it.slug == item.slug }
    var liked by remember(item.slug) { mutableStateOf(false) }
    var muted by remember(item.slug) { mutableStateOf(true) }
    val trailer = detail?.trailer?.takeIf { it.contains("youtube") }?.let { if (it.startsWith("//")) "https:$it" else it }
    // the trailer's WebView starts once the sheet has slid in: creating it mid-slide drops frames
    var trailerReady by remember(item.slug) { mutableStateOf(false) }
    // a weak phone keeps the picture: a playing YouTube page is the heaviest thing the app could show
    LaunchedEffect(trailer) { if (trailer != null && !Device.lite) { delay(450); trailerReady = true } }
    var web by remember { mutableStateOf<WebView?>(null) }

    Column(
        Modifier.fillMaxWidth().pointerInput(Unit) {
            detectVerticalDragGestures(onDragEnd = onDragEnd, onDragCancel = onDragEnd) { change, dy -> change.consume(); onDrag(dy) }
        },
    ) {
        Box(Modifier.fillMaxWidth().aspectRatio(16f / 9f).background(Color.Black)) {
            if (trailer != null && trailerReady) TrailerView(trailer) { web = it }
            else LazyImage(detail?.backdrop ?: item.backdrop.ifEmpty { item.poster }, Modifier.fillMaxSize())
            Box(
                Modifier.align(Alignment.TopEnd).padding(12.dp).size(36.dp).clip(Capsule()).background(SheetBg)
                    .border(1.dp, Color.White.copy(alpha = 0.2f), Capsule()).pressable(onClick = onClose),
                contentAlignment = Alignment.Center,
            ) { LIcon(Lu.X, size = 20.dp, label = "Đóng") }
        }
        Row(Modifier.padding(start = 16.dp, end = 16.dp, top = 16.dp), verticalAlignment = Alignment.Bottom) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Column {
                    Text(
                        (detail?.title ?: item.title).uppercase(), color = Color.White, fontSize = 24.sp, lineHeight = 24.sp,
                        fontWeight = FontWeight.Black, letterSpacing = (-0.6).sp, maxLines = 2, overflow = TextOverflow.Ellipsis,
                        style = TextStyle(shadow = Shadow(Color(0xE6000000), androidx.compose.ui.geometry.Offset(0f, 4f), 16f)),
                    )
                    val sub = detail?.subTitle ?: item.subTitle
                    if (sub.isNotBlank()) Text(sub, color = Color(0xFFD1D5DB), fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 6.dp))
                }
                Row(Modifier.padding(top = 4.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(
                        Modifier.height(40.dp).pressable(onClick = onPlay).clip(rounded(4.dp)).background(Color.White).padding(horizontal = 24.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        FIcon(LuFilled.Play, Modifier.padding(end = 8.dp), size = 16.dp, tint = Color.Black)
                        Text("Phát", color = Color.Black, fontSize = 14.sp, fontWeight = FontWeight.ExtraBold)
                    }
                    RoundButton(if (isFavorite) Lu.Check else Lu.Plus, active = isFavorite, label = if (isFavorite) "Xóa khỏi danh sách của tôi" else "Thêm vào danh sách của tôi") {
                        Library.toggleFavorite(detail?.toItem() ?: item)
                    }
                    RoundButton(Lu.ThumbsUp, active = liked, red = true, label = if (liked) "Đã thích" else "Tôi thích phim này") { liked = !liked }
                }
            }
            if (trailer != null) Box(
                Modifier.size(40.dp).clip(Capsule()).background(SheetBg.copy(alpha = 0.8f)).border(1.dp, Box808, Capsule())
                    .pressable {
                        muted = !muted
                        val cmd = JSONObject().put("event", "command").put("func", if (muted) "mute" else "unMute").put("args", org.json.JSONArray()).toString()
                        web?.evaluateJavascript("document.getElementById('t').contentWindow.postMessage(${JSONObject.quote(cmd)}, '*')", null)
                    },
                contentAlignment = Alignment.Center,
            ) { LIcon(if (muted) Lu.VolumeX else Lu.Volume, size = 16.dp, tint = if (muted) Color(0xFFD1D5DB) else Color.White) }
        }
    }
}

@Composable
private fun RoundButton(icon: Int, active: Boolean, label: String, red: Boolean = false, onClick: () -> Unit) {
    val (bg, border, tint) = when {
        active && red -> Triple(androidx.compose.ui.graphics.Color(0x66E50914), app.capynime.compose.ui.theme.Capy.Red, app.capynime.compose.ui.theme.Capy.Red)
        active -> Triple(Color.White.copy(alpha = 0.2f), Color.White, Color.White)
        else -> Triple(Color(0x992A2A2A), Box808, Color.White)
    }
    Box(Modifier.size(40.dp).pressable(onClick = onClick).clip(Capsule()).background(bg).border(2.dp, border, Capsule()), contentAlignment = Alignment.Center) {
        LIcon(icon, size = 16.dp, tint = tint, label = label)
    }
}

/**
 * A YouTube trailer in a WebView. [ambient]: muted and looping behind the title, taps fall to the sheet;
 * otherwise the normal player with its own controls (the watch page's Trailer tab).
 */
@SuppressLint("SetJavaScriptEnabled", "ClickableViewAccessibility")
@Composable
fun TrailerView(embed: String, ambient: Boolean = true, onWeb: (WebView) -> Unit = {}) {
    val params = if (ambient) "autoplay=1&mute=1&controls=0&loop=1&enablejsapi=1&playsinline=1&modestbranding=1&rel=0" else "playsinline=1&modestbranding=1&rel=0"
    val src = embed + (if ('?' in embed) "&" else "?") + params
    var view by remember { mutableStateOf<WebView?>(null) }
    DisposableEffect(Unit) { onDispose { view?.destroy() } }
    AndroidView(
        factory = { ctx ->
            WebView(ctx).apply {
                setBackgroundColor(android.graphics.Color.BLACK)
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                settings.mediaPlaybackRequiresUserGesture = false
                webChromeClient = WebChromeClient()
                if (ambient) setOnTouchListener { _, _ -> true } // the trailer is a picture: no YouTube UI
                loadDataWithBaseURL(
                    "https://localhost/",
                    """<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;background:#000;overflow:hidden}iframe{position:fixed;inset:0;width:100%;height:100%;border:0${if (ambient) ";pointer-events:none" else ""}}</style></head><body><iframe id="t" src="${src.replace("\"", "&quot;")}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></body></html>""",
                    "text/html", "utf-8", null,
                )
                view = this
                onWeb(this)
            }
        },
        modifier = Modifier.fillMaxSize(),
    )
}

/** TitleFacts.tsx: match score, year, length, rating, the synopsis, then people, genres and studio */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Facts(item: AnimeItem, detail: AnimeDetail?, modifier: Modifier) {
    var open by remember(item.slug) { mutableStateOf(false) }
    val rating = detail?.rating ?: item.rating
    val seasons = detail?.seasons.orEmpty()
    val total = detail?.episodes?.size ?: 0
    val ageRating = "T16"
    Column(modifier, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        FlowRow(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp), itemVerticalAlignment = Alignment.CenterVertically) {
            Text(if (rating != null) "${Math.round(rating * 10)}% Phù hợp" else "98% Phù hợp", color = Match, fontSize = 16.sp, fontWeight = FontWeight.Bold)
            Text(detail?.fact("Season")?.ifBlank { null } ?: (detail?.year ?: item.year ?: 2025).toString(), color = Soft, fontSize = 16.sp)
            Text(
                when {
                    seasons.size > 1 -> "${seasons.size} phần"
                    detail != null && detail.fact("Thời lượng").isNotBlank() -> detail.fact("Thời lượng")
                    total > 0 -> "$total tập"
                    else -> item.episode.ifBlank { detail?.status ?: "HD Vietsub" }
                },
                color = Soft, fontSize = 16.sp,
            )
            Text(
                (detail?.quality ?: item.quality).ifBlank { "HD" }.uppercase(), color = Color(0xFFE5E5E5), fontSize = 11.sp, lineHeight = 18.sp, fontWeight = FontWeight.Medium,
                modifier = Modifier.border(1.dp, Box808, rounded(3.dp)).padding(horizontal = 6.dp),
            )
        }
        Text(ageRating, color = Color.White, fontSize = 14.sp, lineHeight = 24.sp, modifier = Modifier.border(1.dp, Box808).padding(horizontal = 8.dp))
        val synopsis = (detail?.synopsis ?: item.synopsis).ifBlank { "Đang cập nhật nội dung chi tiết cho bộ anime này..." }
        Text(synopsis, color = Color.White, fontSize = 15.sp, lineHeight = 24.4.sp, maxLines = if (open) Int.MAX_VALUE else 4, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 4.dp))
        if (synopsis.length > 180) Text(if (open) "Thu gọn" else "Xem thêm", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.pressable { open = !open })
        Column(Modifier.padding(top = 8.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Fact("Thể loại", (detail?.genres ?: item.genres).joinToString(", "))
            Fact("Đạo diễn", detail?.fact("Đạo diễn").orEmpty())
            Fact("Studio", detail?.fact("Studio").orEmpty())
            Fact("Quốc gia", detail?.fact("Quốc gia").orEmpty())
            Fact("Bộ phim này", "Hóm hỉnh, Hồi hộp, Đầy cảm xúc")
        }
    }
}

@Composable
private fun Fact(label: String, value: String) {
    if (value.isBlank()) return
    Text(
        buildAnnotatedString {
            withStyle(SpanStyle(color = Muted)) { append("$label: ") }
            append(value)
        },
        color = Color.White, fontSize = 14.sp, lineHeight = 22.75.sp,
    )
}

/** "Tập": the heading, the range and part pickers, the part's status line */
@Composable
private fun EpisodesHead(detail: AnimeDetail?, activeSlug: String, count: Int, loading: Boolean, onSeason: (String) -> Unit, onChunk: (Int) -> Unit) {
    val seasons = detail?.seasons.orEmpty()
    if (!loading && count == 0 && seasons.size <= 1) return
    Column(Modifier.padding(start = 16.dp, end = 16.dp, top = 24.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Tập", color = Color.White, fontSize = 24.sp, lineHeight = 32.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
            val chunks = (count + CHUNK - 1) / CHUNK
            if (chunks > 1) Picker("Tập ${(chunks - 1) * CHUNK + 1} - $count", List(chunks) { i -> "Tập ${i * CHUNK + 1} - ${minOf(count, (i + 1) * CHUNK)}" }, onChunk)
            if (seasons.size > 1) Picker(seasons.firstOrNull { it.slug == activeSlug }?.title ?: "Chọn phần", seasons.map { it.title }) { onSeason(seasons[it].slug) }
        }
        if (!loading && detail != null) Row(Modifier.padding(top = 8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            seasons.firstOrNull { it.slug == activeSlug }?.let { Text("${it.title}:", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold) }
            Text("T16", color = Color.White, fontSize = 14.sp, lineHeight = 20.sp, modifier = Modifier.border(1.dp, Box808).padding(horizontal = 6.dp))
            Text(detail.status, color = Soft, fontSize = 14.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
    }
}

/** PickerDropdown.tsx: a glass pill that opens a list */
@Composable
private fun Picker(label: String, options: List<String>, onPick: (Int) -> Unit) {
    var open by remember { mutableStateOf(false) }
    var current by remember(options) { mutableStateOf(label) }
    Box(Modifier.padding(start = 8.dp)) {
        Row(Modifier.height(36.dp).pressable { open = true }.glassPill().padding(horizontal = 14.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(current, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
            LIcon(Lu.ChevronDown, Modifier.padding(start = 6.dp), size = 16.dp)
        }
        DropdownMenu(open, { open = false }, containerColor = Color(0xFF262626), shape = rounded(12.dp)) {
            options.forEachIndexed { i, o ->
                DropdownMenuItem({ Text(o, color = Color.White, fontSize = 14.sp) }, onClick = { open = false; current = o; onPick(i) })
            }
        }
    }
}

@Composable
private fun EpisodeRowsSkeleton(count: Int) {
    Column(Modifier.padding(top = 12.dp)) {
        repeat(count) {
            Row(Modifier.padding(horizontal = 16.dp, vertical = 20.dp), verticalAlignment = Alignment.CenterVertically) {
                Skeleton(Modifier.width(112.dp).aspectRatio(16f / 9f), 4.dp)
                Column(Modifier.padding(start = 12.dp).weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Skeleton(Modifier.fillMaxWidth(0.33f).height(16.dp))
                    Skeleton(Modifier.fillMaxWidth(0.66f).height(12.dp))
                }
            }
        }
    }
}

@Composable
private fun EpisodeRow(ep: Episode, thumb: String, modifier: Modifier, onClick: () -> Unit) {
    Row(
        modifier.fillMaxWidth().row().pressable(pressedScale = 0.99f, onClick = onClick)
            .drawBehind { drawLine(Line, Offset(0f, size.height - 0.5f), Offset(size.width, size.height - 0.5f), 1.dp.toPx()) }
            .padding(vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        LazyImage(thumb, Modifier.width(112.dp).aspectRatio(16f / 9f).clip(rounded(4.dp)).background(Color.Black.copy(alpha = 0.6f)))
        Text(ep.title, color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(start = 12.dp).weight(1f))
        Text("24 ph", color = Color.White, fontSize = 16.sp, modifier = Modifier.padding(start = 12.dp))
    }
}

/** TitleRelated.tsx: up to six related titles; a tap opens that title's preview in place */
@Composable
private fun Related(related: List<AnimeItem>, fallback: String, modifier: Modifier, onOpen: (AnimeItem) -> Unit) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text("Nội dung tương tự", color = Color.White, fontSize = 24.sp, lineHeight = 32.sp, fontWeight = FontWeight.Bold)
        related.take(6).chunked(2).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                row.forEach { r ->
                    Column(Modifier.weight(1f).pressable { onOpen(r) }.clip(rounded(4.dp)).background(Color(0xFF2F2F2F))) {
                        Box(Modifier.fillMaxWidth().aspectRatio(16f / 9f).background(Color.Black.copy(alpha = 0.4f))) {
                            LazyImage(r.poster.ifEmpty { fallback }, Modifier.fillMaxSize(), art = r)
                            Text(
                                r.episode.ifBlank { "HD" }, color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold,
                                modifier = Modifier.align(Alignment.TopEnd).padding(8.dp).clip(rounded(2.dp)).background(Color.Black.copy(alpha = 0.75f)).padding(horizontal = 6.dp, vertical = 2.dp),
                            )
                        }
                        Column(Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("97% Phù hợp", color = Match, fontSize = 12.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                                Text(
                                    r.quality.ifBlank { "HD" }, color = Color(0xFFD1D5DB), fontSize = 9.sp, lineHeight = 12.sp, fontWeight = FontWeight.Bold,
                                    modifier = Modifier.border(1.dp, Color(0xFF6B7280), rounded(2.dp)).padding(horizontal = 6.dp, vertical = 2.dp),
                                )
                            }
                            Text(r.title, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        }
                    }
                }
                if (row.size == 1) Box(Modifier.weight(1f))
            }
        }
    }
}

/** TitleAbout.tsx: "Giới thiệu về …", the full credits at the end */
@Composable
private fun About(item: AnimeItem, detail: AnimeDetail?, modifier: Modifier) {
    Column(modifier.padding(top = 24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text(
            buildAnnotatedString {
                append("Giới thiệu về ")
                withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append(detail?.title ?: item.title) }
            },
            color = Color.White, fontSize = 24.sp, lineHeight = 32.sp,
        )
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            AboutLine("Đạo diễn", detail?.fact("Đạo diễn").orEmpty())
            AboutLine("Studio sản xuất", detail?.fact("Studio").orEmpty())
            AboutLine("Thể loại", (detail?.genres ?: item.genres).joinToString(", "))
            AboutLine("Xếp hạng độ tuổi", "T16 - Thích hợp cho khán giả từ 13 tuổi trở lên. Có chứa các yếu tố tình cảm, tâm lý học đường.")
        }
    }
}

@Composable
private fun AboutLine(label: String, value: String) {
    if (value.isBlank()) return
    Text(
        buildAnnotatedString {
            append("$label: ")
            withStyle(SpanStyle(color = Color(0xFFA3A3A3))) { append(value) }
        },
        color = Muted, fontSize = 14.sp, lineHeight = 22.75.sp,
    )
}
