package app.capynime.compose.ui.screens

import android.app.Activity
import android.app.ActivityManager
import android.content.Context
import android.content.pm.ActivityInfo
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import app.capynime.compose.ui.glass.dropShadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import app.capynime.compose.data.AnimeDetail
import app.capynime.compose.data.AnimeRepository
import app.capynime.compose.data.Episode
import app.capynime.compose.data.HdArt
import app.capynime.compose.data.HistoryEntry
import app.capynime.compose.data.Library
import app.capynime.compose.data.SkipTimes
import app.capynime.compose.data.SkipTimesRepository
import app.capynime.compose.player.PlayerController
import app.capynime.compose.player.PlayerSurface
import app.capynime.compose.player.ResumePrompt
import app.capynime.compose.ui.FIcon
import app.capynime.compose.ui.LIcon
import app.capynime.compose.ui.LocalNav
import app.capynime.compose.ui.Lu
import app.capynime.compose.ui.LuFilled
import app.capynime.compose.ui.common.LazyImage
import app.capynime.compose.ui.common.Load
import app.capynime.compose.ui.common.MovieShelf
import app.capynime.compose.ui.common.Skeleton
import app.capynime.compose.ui.common.WhiteButton
import app.capynime.compose.ui.common.fmtRating
import app.capynime.compose.ui.common.friendly
import app.capynime.compose.ui.common.rememberLoad
import app.capynime.compose.ui.dockPadding
import app.capynime.compose.ui.glass.glassCard
import app.capynime.compose.ui.glass.glassPill
import app.capynime.compose.ui.glass.pressable
import app.capynime.compose.ui.glass.rounded
import app.capynime.compose.ui.theme.BeVietnam
import app.capynime.compose.ui.theme.Capy
import app.capynime.compose.ui.glass.Capsule
import androidx.compose.ui.graphics.shadow.Shadow as DropShadow
import kotlin.math.roundToInt

private const val SAVE_EVERY_MS = 5000L

/** A weak phone (the web's html[data-lite]): cheaper picture passes, no Anime4K */
private fun isLite(context: Context): Boolean {
    val am = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
    val info = ActivityManager.MemoryInfo().also(am::getMemoryInfo)
    return app.capynime.compose.ui.common.Device.lite || am.isLowRamDevice || info.totalMem <= 4L * 1024 * 1024 * 1024 || Runtime.getRuntime().availableProcessors() <= 4
}

/** /watch?slug=&ep=: the player, what is playing, the episodes, the details, comments, related titles */
@Composable
fun WatchScreen(slug: String, requestedEpisode: String?) {
    val nav = LocalNav.current
    val context = LocalContext.current
    val activity = context as? Activity
    var currentSlug by rememberSaveable(slug) { mutableStateOf(slug) }
    var episodeId by rememberSaveable(slug, requestedEpisode) { mutableStateOf(requestedEpisode) }
    var fullscreen by rememberSaveable(slug) { mutableStateOf(false) }
    val controller = remember(context, slug) { PlayerController(context) }
    val lite = remember { isLite(context) }
    val prefs by Library.player.collectAsState()
    val detail = rememberLoad("detail:$currentSlug", staleMs = 10 * 60_000) { AnimeRepository.detail(currentSlug) }
    val d = (detail.value as? Load.Ok)?.value

    val lifecycle = LocalLifecycleOwner.current.lifecycle
    SideEffect { nav.chrome.immersive = fullscreen }
    LaunchedEffect(fullscreen) { activity?.let { setFullscreen(it, fullscreen) } }
    BackHandler(enabled = fullscreen) { fullscreen = false }

    val episodes = d?.episodes.orEmpty()
    val episode: Episode? = remember(d, episodeId) {
        episodes.firstOrNull { it.id == episodeId }
            ?: Library.historyOf(currentSlug)?.let { h -> episodes.firstOrNull { it.id == h.episodeId } }
            ?: episodes.firstOrNull()
    }
    val index = episodes.indexOf(episode)
    val next = episodes.getOrNull(index + 1)

    // ---- the stream of the episode that plays ----
    var streamError by remember(controller) { mutableStateOf<String?>(null) }
    var streamLoading by remember(controller) { mutableStateOf(false) }
    var attempt by remember(controller) { mutableIntStateOf(0) }
    var resumeAt by remember(controller) { mutableStateOf<Double?>(null) }
    // Associate a clock with the episode actually loaded, not the next episode selected in the UI.
    var loadedPlayback by remember(controller) { mutableStateOf<Pair<String, String>?>(null) }
    fun saveCurrentProgress() {
        val key = loadedPlayback ?: return
        val s = controller.state ?: return
        if (resumeAt == null && controller.resumeOffer == null && s.currentTime.isFinite() && s.duration.isFinite() && s.duration > 0)
            Library.saveProgress(key.first, key.second, s.currentTime, s.duration)
    }
    val persistProgress = remember(controller) { mutableStateOf<() -> Unit>({}) }
    SideEffect { persistProgress.value = { saveCurrentProgress() } }
    DisposableEffect(lifecycle, controller) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_PAUSE) {
                persistProgress.value()
                controller.pause()
                controller.onPause()
            }
            if (event == Lifecycle.Event.ON_RESUME) controller.onResume()
        }
        lifecycle.addObserver(observer)
        onDispose {
            persistProgress.value()
            lifecycle.removeObserver(observer)
            controller.destroy()
            nav.chrome.immersive = false
            HdArt.held.value = false
            activity?.let { setFullscreen(it, false) }
        }
    }
    LaunchedEffect(currentSlug, episode?.id, attempt, controller) {
        saveCurrentProgress()
        loadedPlayback = null
        controller.pause()
        val ep = episode ?: return@LaunchedEffect
        streamLoading = true
        streamError = null
        resumeAt = Library.resumePoint(currentSlug, ep.id)
        try {
            controller.load(AnimeRepository.stream(ep))
            loadedPlayback = currentSlug to ep.id
            d?.let { Library.addHistory(HistoryEntry(it.slug, it.title, it.poster, ep.id, ep.title, System.currentTimeMillis())) }
        } catch (e: kotlinx.coroutines.CancellationException) {
            throw e
        } catch (e: Throwable) {
            streamError = friendly(e)
        } finally {
            streamLoading = false
        }
    }

    // ---- position, resume, next episode, CapyCinema ----
    val state = if (controller.ready && loadedPlayback == (currentSlug to episode?.id)) controller.state else null
    // covers wait while the video fills its buffer (hd-art.ts holdArt)
    LaunchedEffect(state?.waiting, controller.loaded) { HdArt.held.value = !controller.loaded || state?.waiting == true }
    var lastSave by remember(currentSlug, episode?.id) { mutableLongStateOf(0L) }
    LaunchedEffect(state) {
        val s = state ?: return@LaunchedEffect
        val ep = episode ?: return@LaunchedEffect
        val now = System.currentTimeMillis()
        if (resumeAt == null && controller.resumeOffer == null && s.duration > 0 && (now - lastSave > SAVE_EVERY_MS || s.paused || s.ended)) {
            lastSave = now
            saveCurrentProgress()
        }
        if (s.ended && prefs.autoNext && next != null) episodeId = next.id
    }
    val offered = resumeAt ?: controller.resumeOffer
    val askResume = offered != null && controller.ready && (controller.resumeOffer != null || (state?.duration ?: 0.0) > 0)
    LaunchedEffect(askResume) { if (askResume) controller.pause() }
    LaunchedEffect(controller.ready, prefs) { if (controller.ready) controller.enhance(prefs, lite) }

    // No guessed 90-second jump: only a confirmed match and this episode's actual AniSkip interval.
    val duration = state?.duration?.takeIf { it.isFinite() && it > 0 }?.roundToInt() ?: 0
    var skipTimes by remember(currentSlug, episode?.id, duration) { mutableStateOf(SkipTimes()) }
    var introSkipped by remember(currentSlug, episode?.id) { mutableStateOf(false) }
    var endingDismissed by remember(currentSlug, episode?.id) { mutableStateOf(false) }
    LaunchedEffect(d?.slug, episode?.id, duration) {
        val detailValue = d ?: return@LaunchedEffect
        val currentEpisode = episode ?: return@LaunchedEffect
        if (duration > 0) skipTimes = SkipTimesRepository.lookup(
            detailValue.slug, detailValue.title, detailValue.subTitle, detailValue.year, currentEpisode.name, duration.toDouble(),
        )
    }
    val opening = if (!askResume && !introSkipped && !streamLoading) state?.let { skipTimes.openingAt(it.currentTime) } else null
    val inEnding = !askResume && !endingDismissed && !streamLoading && next != null &&
        state?.let { skipTimes.inEnding(it.currentTime, it.duration) } == true

    fun answerResume(resume: Boolean) {
        val ours = resumeAt
        if (controller.resumeOffer != null) {
            controller.send("resume", if (resume && ours == null) 1 else 0)
            controller.resumeOffer = null
            if (resume && ours == null) return
        }
        resumeAt = null
        controller.seek(if (resume) ours ?: 0.0 else 0.0)
        controller.play()
    }

    val scroll = rememberScrollState()
    Column(
        Modifier.fillMaxSize()
            .then(if (fullscreen) Modifier.background(Color.Black) else Modifier.verticalScroll(scroll).padding(start = 16.dp, end = 16.dp, top = 12.dp, bottom = dockPadding() + 24.dp)),
        verticalArrangement = Arrangement.spacedBy(if (fullscreen) 0.dp else 16.dp),
    ) {
        if (!fullscreen) WatchTopBar(d)
        // the same node in and out of full screen, so the WebView is never re-created
        Box(
            if (fullscreen) Modifier.fillMaxSize()
            else Modifier.fillMaxWidth().dropShadow(rounded(12.dp), DropShadow(radius = 50.dp, color = Color.Black.copy(alpha = 0.25f), offset = androidx.compose.ui.unit.DpOffset(0.dp, 25.dp)))
                .clip(rounded(12.dp)).background(Color.Black).aspectRatio(16f / 9f),
        ) {
            PlayerSurface(
                controller = controller,
                title = d?.title.orEmpty(),
                episodeLabel = episode?.title.orEmpty(),
                fullscreen = fullscreen,
                hasNext = next != null,
                onNext = { next?.let { episodeId = it.id } },
                onToggleFullscreen = { fullscreen = !fullscreen },
                modifier = Modifier.fillMaxSize(),
                episodes = { close -> EpisodeButtons(episodes, episode?.id) { episodeId = it.id; close() } },
            )
            if (streamLoading) Box(Modifier.fillMaxSize().background(Color.Black), contentAlignment = Alignment.Center) {
                Text("Đang tải video...", color = Capy.Gray300, fontSize = 14.sp)
            }
            if (opening != null || inEnding) Row(
                Modifier.align(Alignment.BottomEnd).padding(end = 16.dp, bottom = 64.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(
                    Modifier.height(44.dp).pressable {
                        if (opening != null) {
                            controller.seek(opening.end)
                            introSkipped = true
                        } else next?.let { episodeId = it.id }
                    }.glassPill().padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically,
                ) {
                    LIcon(Lu.SkipForward, size = 16.dp)
                    Text(if (opening != null) "Bỏ qua giới thiệu" else "Tập tiếp theo", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                }
                if (inEnding && opening == null) Box(
                    Modifier.size(44.dp).pressable { endingDismissed = true }.glassPill(), contentAlignment = Alignment.Center,
                ) { LIcon(Lu.X, size = 16.dp, label = "Ẩn tập tiếp theo") }
            }
            streamError?.let { message ->
                Column(Modifier.fillMaxSize().background(Color.Black).padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                    LIcon(Lu.Alert, size = 56.dp, tint = Capy.Red)
                    Text("Không tải được video", color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 16.dp))
                    Text(message, color = Capy.TextDim, fontSize = 14.sp, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 4.dp, bottom = 16.dp))
                    WhiteButton("Thử lại", icon = Lu.RotateCw, height = 40.dp) { attempt++ }
                }
            }
            if (askResume && offered != null) ResumePrompt(offered, { answerResume(true) }, { answerResume(false) })
        }
        if (!fullscreen) when {
            detail.value is Load.Failed -> WatchError()
            d == null -> {
                Skeleton(Modifier.fillMaxWidth().height(88.dp), 12.dp)
                Skeleton(Modifier.fillMaxWidth().height(160.dp), 12.dp)
            }
            else -> {
                NowPlaying(d, episode, if (next != null) ({ episodeId = next.id }) else null)
                EpisodeGrid(d, episode, { episodeId = it.id }) { s -> if (s != currentSlug) { currentSlug = s; episodeId = null } }
                DetailTabs(d)
                CommentsSection(d.slug, episode)
                if (d.related.isNotEmpty()) MovieShelf("Phim Liên Quan", d.related, nav.openTitle)
            }
        }
    }
}

/** WatchTopBar: back, and the favourite button */
@Composable
private fun WatchTopBar(d: AnimeDetail?) {
    val nav = LocalNav.current
    val favorites by Library.favorites.collectAsState()
    val fav = d != null && favorites.any { it.slug == d.slug }
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Row(Modifier.height(36.dp).pressable { nav.back() }.glassPill().padding(horizontal = 16.dp), verticalAlignment = Alignment.CenterVertically) {
            LIcon(Lu.ArrowLeft, size = 14.dp, tint = Capy.Gray200)
            Text("Quay lại", color = Capy.Gray200, fontSize = 14.sp, fontWeight = FontWeight.Medium, modifier = Modifier.padding(start = 8.dp))
        }
        Box(Modifier.weight(1f))
        Row(
            Modifier.height(36.dp).pressable { d?.let { Library.toggleFavorite(it.toItem()) } }
                .then(
                    if (fav) Modifier.dropShadow(Capsule(), DropShadow(radius = 18.dp, color = Capy.Red.copy(alpha = 0.35f)))
                        .clip(Capsule()).background(Capy.Red.copy(alpha = 0.2f)).border(1.dp, Capy.Red.copy(alpha = 0.5f), Capsule())
                    else Modifier.glassPill(),
                ).padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (fav) FIcon(LuFilled.Heart, size = 14.dp) else LIcon(Lu.Heart, size = 14.dp, tint = Capy.Gray200)
            Text(if (fav) "Đã yêu thích" else "Yêu thích", color = if (fav) Color.White else Capy.Gray200, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(start = 8.dp))
        }
    }
}

@Composable
private fun WatchError() {
    val nav = LocalNav.current
    Column(
        Modifier.fillMaxWidth().padding(vertical = 40.dp).clip(rounded(12.dp)).background(Capy.Surface).border(1.dp, Color.White.copy(alpha = 0.1f), rounded(12.dp)).padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        LIcon(Lu.Alert, size = 56.dp, tint = Capy.Red)
        Text("Không thể tải thông tin phim", color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
        Text("Vui lòng kiểm tra kết nối hoặc quay lại trang chủ.", color = Capy.TextDim, fontSize = 14.sp, textAlign = TextAlign.Center)
        Box(Modifier.padding(top = 16.dp).height(40.dp).pressable { nav.tab("home") }.clip(Capsule()).background(Capy.Red).padding(horizontal = 24.dp), contentAlignment = Alignment.Center) {
            Text("Quay lại Trang Chủ", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

/** NowPlaying: what is playing, with the next-episode button */
@Composable
private fun NowPlaying(d: AnimeDetail, episode: Episode?, onNext: (() -> Unit)?) {
    Row(Modifier.fillMaxWidth().glassCard().padding(start = 12.dp, top = 12.dp, bottom = 12.dp, end = 16.dp), verticalAlignment = Alignment.CenterVertically) {
        LazyImage(d.poster, Modifier.width(48.dp).height(64.dp).clip(rounded(8.dp)), art = d.toItem())
        Column(Modifier.padding(horizontal = 12.dp).weight(1f)) {
            Text("ĐANG XEM", color = Capy.Red, fontSize = 11.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 0.55.sp)
            Text(d.title, color = Color.White, fontSize = 16.sp, lineHeight = 24.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(
                listOfNotNull(episode?.title, d.episodes.size.takeIf { it > 0 }?.let { "$it tập" }).joinToString(" · "),
                color = Capy.TextDim, fontSize = 12.sp, lineHeight = 16.sp, maxLines = 1, overflow = TextOverflow.Ellipsis,
            )
        }
        if (onNext != null) Box(Modifier.size(40.dp).pressable(pressedScale = 0.95f, onClick = onNext).clip(Capsule()).background(Color.White), contentAlignment = Alignment.Center) {
            LIcon(Lu.SkipForward, size = 16.dp, tint = Color.Black, label = "Tập tiếp")
        }
    }
}

/** "Tập 01" from "01" */
private fun Episode.label() = title

/** EpisodeGrid.tsx: the count, a number filter, range and part pickers, then the episode buttons */
@Composable
private fun EpisodeGrid(d: AnimeDetail, current: Episode?, onPick: (Episode) -> Unit, onSeason: (String) -> Unit) {
    var filter by remember(d.slug) { mutableStateOf("") }
    val groups = remember(d.episodes) { d.episodes.chunked(50) }
    var picked by remember(d.slug) { mutableStateOf<Int?>(null) }
    val watching = groups.indexOfFirst { g -> g.any { it.id == current?.id } }
    val active = picked ?: watching.takeIf { it >= 0 } ?: 0
    val query = filter.trim().lowercase()
    val shown = if (query.isNotEmpty()) d.episodes.filter { it.name.lowercase().contains(query) || it.title.lowercase().contains(query) } else groups.getOrElse(active) { emptyList() }

    Column(Modifier.fillMaxWidth().glassCard().padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Tập", color = Color.White, fontSize = 24.sp, lineHeight = 32.sp, fontWeight = FontWeight.Bold)
            Text(
                "${d.episodes.size} tập", color = Capy.Gray300, fontSize = 12.sp, fontWeight = FontWeight.Medium,
                modifier = Modifier.padding(start = 12.dp).clip(Capsule()).background(Color.White.copy(alpha = 0.05f)).border(1.dp, Color.White.copy(alpha = 0.15f), Capsule())
                    .padding(horizontal = 10.dp, vertical = 2.dp),
            )
            Box(Modifier.weight(1f))
            if (d.episodes.size > 12) Box(
                Modifier.width(176.dp).height(42.dp).clip(rounded(4.dp)).background(Color(0xFF242424)).border(1.dp, Color(0xFF4D4D4D), rounded(4.dp)),
                contentAlignment = Alignment.CenterStart,
            ) {
                LIcon(Lu.Search, Modifier.padding(start = 12.dp), size = 14.dp, tint = Capy.TextDim)
                BasicTextField(
                    filter, { filter = it }, Modifier.fillMaxWidth().padding(start = 36.dp, end = 8.dp),
                    singleLine = true,
                    textStyle = TextStyle(color = Color.White, fontSize = 14.sp, fontFamily = BeVietnam),
                    cursorBrush = SolidColor(Color.White),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    decorationBox = { inner ->
                        if (filter.isEmpty()) Text("Tìm số tập...", color = Capy.TextDim, fontSize = 14.sp)
                        inner()
                    },
                )
            }
        }
        if (groups.size > 1 || d.seasons.size > 1) Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            if (groups.size > 1) PillPicker(
                "Tập ${active * 50 + 1} - ${minOf(d.episodes.size, (active + 1) * 50)}",
                groups.indices.map { "Tập ${it * 50 + 1} - ${minOf(d.episodes.size, (it + 1) * 50)}" },
            ) { picked = it }
            if (d.seasons.size > 1) PillPicker(d.seasons.firstOrNull { it.isCurrent }?.title ?: "Chọn phần", d.seasons.map { it.title }) { onSeason(d.seasons[it].slug) }
        }
        if (shown.isEmpty()) Text(
            if (d.episodes.isEmpty()) "Chưa có danh sách tập phim cho nội dung này." else "Không tìm thấy tập phù hợp.",
            color = Capy.TextDim, fontSize = 14.sp, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(vertical = 32.dp),
        ) else Box(Modifier.heightIn(max = 320.dp).verticalScroll(rememberScrollState())) {
            EpisodeButtons(shown, current?.id, onPick)
        }
    }
}

/** The 4-column episode buttons: the playing one red and glowing */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun EpisodeButtons(episodes: List<Episode>, currentId: String?, onPick: (Episode) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        episodes.chunked(4).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                row.forEach { ep ->
                    val active = ep.id == currentId
                    Box(
                        Modifier.weight(1f).height(40.dp).pressable(pressedScale = 0.95f) { onPick(ep) }
                            .then(
                                if (active) Modifier.dropShadow(rounded(8.dp), DropShadow(radius = 18.dp, color = Capy.Red.copy(alpha = 0.5f))).clip(rounded(8.dp)).background(Capy.Red)
                                else Modifier.glassPill(rounded(8.dp)),
                            ),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(ep.label(), color = if (active) Color.White else Capy.Gray200, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(horizontal = 4.dp))
                    }
                }
                repeat(4 - row.size) { Box(Modifier.weight(1f)) }
            }
        }
    }
}

@Composable
private fun PillPicker(label: String, options: List<String>, onPick: (Int) -> Unit) {
    var open by remember { mutableStateOf(false) }
    Box {
        Row(Modifier.height(36.dp).pressable { open = true }.glassPill().padding(horizontal = 14.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(label, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
            LIcon(Lu.ChevronDown, Modifier.padding(start = 6.dp), size = 16.dp)
        }
        androidx.compose.material3.DropdownMenu(open, { open = false }, containerColor = Color(0xFF262626), shape = rounded(12.dp)) {
            options.forEachIndexed { i, o ->
                androidx.compose.material3.DropdownMenuItem({ Text(o, color = Color.White, fontSize = 14.sp) }, onClick = { open = false; onPick(i) })
            }
        }
    }
}

// [fact key, label shown]: a row only renders when the source has the value (AnimeDetailTabs INFO_FIELDS)
private val INFO_FIELDS = listOf(
    "Trạng thái" to "Trạng thái", "Thời lượng" to "Số tập", "Season" to "Mùa phát hành", "Đạo diễn" to "Đạo diễn",
    "Studio" to "Studio sản xuất", "Quốc gia" to "Quốc gia", "Ngôn ngữ" to "Ngôn ngữ", "Chất lượng" to "Chất lượng", "Theo dõi" to "Người theo dõi",
)

/** AnimeDetailTabs.tsx: poster, title, key facts, synopsis, genres, then Thông tin / Trailer / Hình ảnh */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun DetailTabs(d: AnimeDetail) {
    var expanded by remember(d.slug) { mutableStateOf(false) }
    var tab by remember(d.slug) { mutableIntStateOf(0) }
    val season = d.facts.firstOrNull { it.first == "Season" }?.second
    Column(Modifier.fillMaxWidth().glassCard().padding(20.dp), verticalArrangement = Arrangement.spacedBy(24.dp)) {
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Row {
                LazyImage(d.poster, Modifier.width(96.dp).aspectRatio(283f / 400f).clip(rounded(8.dp)).border(1.dp, Color.White.copy(alpha = 0.1f), rounded(8.dp)), art = d.toItem())
                Column(Modifier.padding(start = 16.dp).weight(1f), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Column {
                        Text(d.title, color = Color.White, fontSize = 20.sp, lineHeight = 25.sp, fontWeight = FontWeight.Bold)
                        if (d.subTitle.isNotBlank()) Text(d.subTitle, color = Capy.TextDim, fontSize = 14.sp, lineHeight = 20.sp, maxLines = 2, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 4.dp))
                    }
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        fmtRating(d.rating)?.let { MetaBadge(null, "$it/10", amber = true) }
                        if (d.views.isNotBlank()) MetaBadge(Lu.Eye, d.views)
                        if (!season.isNullOrBlank()) MetaBadge(Lu.CalendarDays, season)
                        if (d.episodes.isNotEmpty()) MetaBadge(Lu.Clock, "${d.episodes.size} tập")
                    }
                }
            }
            if (d.synopsis.isNotBlank()) Column {
                Text(d.synopsis, color = Capy.Gray200, fontSize = 14.sp, lineHeight = 22.75.sp, maxLines = if (expanded) Int.MAX_VALUE else 3, overflow = TextOverflow.Ellipsis)
                if (d.synopsis.length > 220) Text(if (expanded) "Thu gọn" else "Xem thêm", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 4.dp).pressable { expanded = !expanded })
            }
            if (d.genres.isNotEmpty()) FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                d.genres.forEach { g ->
                    Text(g, color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Medium, modifier = Modifier.clip(rounded(6.dp)).background(Color.White.copy(alpha = 0.1f)).padding(horizontal = 10.dp, vertical = 2.dp))
                }
            }
        }
        // the tab bar: four equal tabs across the full width
        Row(Modifier.fillMaxWidth().height(40.dp).clip(Capsule()).background(Color.White.copy(alpha = 0.05f)).border(1.dp, Color.White.copy(alpha = 0.08f), Capsule()).padding(4.dp)) {
            listOf("Thông tin", "Trailer", "Hình ảnh").forEachIndexed { i, label ->
                val active = i == tab
                Box(
                    Modifier.weight(1f).fillMaxSize().clip(Capsule()).then(if (active) Modifier.background(Color.White) else Modifier).pressable(pressedScale = 1f) { tab = i },
                    contentAlignment = Alignment.Center,
                ) { Text(label, color = if (active) Color.Black else Capy.TextDim, fontSize = 12.sp, fontWeight = FontWeight.SemiBold) }
            }
        }
        when (tab) {
            0 -> {
                val rows = INFO_FIELDS.mapNotNull { (key, label) -> d.facts.firstOrNull { it.first == key }?.second?.replace(Regex("[\\s,]+$"), "")?.trim()?.takeIf { it.isNotEmpty() }?.let { label to it } }
                if (rows.isEmpty()) EmptyState("Thông tin chi tiết đang được cập nhật.")
                else Column(verticalArrangement = Arrangement.spacedBy(20.dp)) {
                    rows.chunked(2).forEach { pair ->
                        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            pair.forEach { (label, value) ->
                                Column(
                                    Modifier.weight(1f).drawBehind { drawLine(Color.White.copy(alpha = 0.1f), Offset(1.dp.toPx(), 0f), Offset(1.dp.toPx(), size.height), 2.dp.toPx()) }
                                        .padding(start = 12.dp),
                                ) {
                                    Text(label, color = Capy.TextFaint, fontSize = 12.sp)
                                    Text(value, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Medium, modifier = Modifier.padding(top = 4.dp))
                                }
                            }
                            if (pair.size == 1) Box(Modifier.weight(1f))
                        }
                    }
                }
            }
            1 -> {
                val trailer = d.trailer?.let { if (it.startsWith("//")) "https:$it" else it }
                if (trailer == null) EmptyState("Phim hiện chưa có trailer chính thức.")
                else Box(Modifier.fillMaxWidth().aspectRatio(16f / 9f).clip(rounded(8.dp)).border(1.dp, Color.White.copy(alpha = 0.1f), rounded(8.dp)).background(Color.Black)) {
                    TrailerView(trailer, ambient = false)
                }
            }
            else -> LazyImage(d.backdrop, Modifier.fillMaxWidth().aspectRatio(16f / 9f).clip(rounded(8.dp)).border(1.dp, Color.White.copy(alpha = 0.1f), rounded(8.dp)))
        }
    }
}

@Composable
private fun MetaBadge(icon: Int?, text: String, amber: Boolean = false) {
    Row(
        Modifier.clip(Capsule()).background(if (amber) Capy.Amber400.copy(alpha = 0.1f) else Color.White.copy(alpha = 0.05f))
            .border(1.dp, if (amber) Capy.Amber400.copy(alpha = 0.3f) else Color.White.copy(alpha = 0.15f), Capsule()).padding(horizontal = 12.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (amber) FIcon(LuFilled.Star, size = 14.dp, tint = Capy.Amber)
        else if (icon != null) LIcon(icon, size = 14.dp, tint = Capy.TextDim)
        Text(text, color = if (amber) Capy.Amber else Capy.Gray200, fontSize = 12.sp, fontWeight = FontWeight.Medium, modifier = Modifier.padding(start = 6.dp))
    }
}

@Composable
private fun EmptyState(text: String) = Text(
    text, color = Capy.TextDim, fontSize = 14.sp, textAlign = TextAlign.Center,
    modifier = Modifier.fillMaxWidth().clip(rounded(8.dp)).background(Color.White.copy(alpha = 0.02f)).border(1.dp, Color.White.copy(alpha = 0.05f), rounded(8.dp)).padding(horizontal = 16.dp, vertical = 56.dp),
)

/** Landscape with the system bars hidden while full screen (MainActivity.java setFullscreen) */
private fun setFullscreen(activity: Activity, on: Boolean) {
    activity.requestedOrientation = if (on) ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE else ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
    val bars = WindowCompat.getInsetsController(activity.window, activity.window.decorView)
    if (on) {
        bars.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        bars.hide(WindowInsetsCompat.Type.systemBars())
    } else bars.show(WindowInsetsCompat.Type.systemBars())
}
