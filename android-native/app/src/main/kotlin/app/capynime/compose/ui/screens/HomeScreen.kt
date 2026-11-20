package app.capynime.compose.ui.screens

import app.capynime.compose.ui.common.row
import app.capynime.compose.ui.common.smoothListState
import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import app.capynime.compose.ui.glass.dropShadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.pointer.util.VelocityTracker
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.DpOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import app.capynime.compose.data.AnimeItem
import app.capynime.compose.data.AnimeRepository
import app.capynime.compose.data.Library
import app.capynime.compose.ui.FIcon
import app.capynime.compose.ui.LIcon
import app.capynime.compose.ui.LocalNav
import app.capynime.compose.ui.Lu
import app.capynime.compose.ui.LuFilled
import app.capynime.compose.ui.common.LazyImage
import app.capynime.compose.ui.common.Load
import app.capynime.compose.ui.common.LoadBox
import app.capynime.compose.ui.common.MovieShelf
import app.capynime.compose.ui.common.ShelfHeader
import app.capynime.compose.ui.common.ShelfSkeleton
import app.capynime.compose.ui.common.Skeleton
import app.capynime.compose.ui.common.fmtRating
import app.capynime.compose.ui.common.rememberHdArt
import app.capynime.compose.ui.common.rememberLoad
import app.capynime.compose.ui.dockPadding
import app.capynime.compose.ui.glass.glassButton
import app.capynime.compose.ui.glass.glassRim
import app.capynime.compose.ui.glass.pressable
import app.capynime.compose.ui.glass.rounded
import app.capynime.compose.ui.theme.Capy
import app.capynime.compose.ui.glass.Capsule
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sign
import androidx.compose.ui.graphics.shadow.Shadow as DropShadow

/** --ease-ios: cubic-bezier(0.32, 0.72, 0, 1), the curve every slide and settle uses */
val EaseIos = CubicBezierEasing(0.32f, 0.72f, 0f, 1f)

private class ShelfConfig(val key: String, val title: String, val seeMore: String?, val items: ((app.capynime.compose.data.HomeData) -> List<AnimeItem>)? = null, val path: String? = null)

// HomePage.tsx SHELVES, in display order
private val SHELVES = listOf(
    ShelfConfig("latest", "Mới Cập Nhật Hôm Nay", "/danh-sach/list-dang-chieu/", items = { it.latest }),
    ShelfConfig("upcoming", "Anime Sắp Chiếu", "/anime-sap-chieu/", items = { it.upcoming }),
    ShelfConfig("series", "Phim Bộ Đang Hot", "/anime-bo/", path = "/anime-bo/"),
    ShelfConfig("movies", "Phim Lẻ Chiếu Rạp", "/anime-le/", path = "/anime-le/"),
    ShelfConfig("chinese", "Hoạt Hình 3D Trung Quốc", "/hoat-hinh-trung-quoc/", path = "/hoat-hinh-trung-quoc/"),
    ShelfConfig("featured", "Phim Đề Cử Đặc Sắc", "", items = { it.nominate }),
)

@Composable
fun HomeScreen() {
    val home = rememberLoad("home") { AnimeRepository.home() }
    val nav = LocalNav.current
    LoadBox(home, Modifier.fillMaxSize(), skeleton = { HomeSkeleton() }) { data ->
        // the ranked list: this season's slider, else the featured titles, else the latest
        val ranked = listOf(data.featured, data.nominate, data.latest).firstOrNull { it.isNotEmpty() }.orEmpty()
        LazyColumn(state = smoothListState(), contentPadding = PaddingValues(bottom = dockPadding() + 64.dp)) {
            item("hero") { Box(Modifier.row()) { HeroMobile(ranked.take(16)) } }
            if (ranked.isNotEmpty()) item("ranked") {
                Column(Modifier.row().padding(top = 8.dp, bottom = 32.dp)) {
                    ShelfHeader("Phim Nổi Bật Đề Cử", Modifier.padding(bottom = 16.dp)) { nav.explore() }
                    StackCarousel(ranked)
                }
            }
            SHELVES.forEach { shelf ->
                item(shelf.key) {
                    val onSeeAll: (() -> Unit) = { nav.explore(shelf.seeMore.orEmpty()) }
                    if (shelf.path != null) LazyShelf(shelf.title, shelf.path, onSeeAll)
                    else MovieShelf(shelf.title, shelf.items!!(data), nav.openTitle, onSeeAll)
                }
            }
        }
    }
}

/** LazyShelf.tsx: asks the source for its list once composed (scrolled near), holding its place meanwhile */
@Composable
private fun LazyShelf(title: String, path: String, onSeeAll: () -> Unit) {
    val nav = LocalNav.current
    val list = rememberLoad("browse:$path:1") { AnimeRepository.browse(path, 1) }
    when (val s = list.value) {
        is Load.Ok -> MovieShelf(title, s.value.items, nav.openTitle, onSeeAll)
        is Load.Loading -> ShelfSkeleton()
        is Load.Failed -> Unit // no gap for a list that could not load
    }
}

@Composable
private fun HomeSkeleton() {
    Column(Modifier.padding(top = 16.dp)) {
        Column(Modifier.padding(horizontal = 16.dp)) {
            Skeleton(Modifier.width(256.dp).height(28.dp))
            Skeleton(Modifier.padding(top = 16.dp).fillMaxWidth().height(460.dp), 12.dp)
        }
        ShelfSkeleton(Modifier.padding(top = 12.dp))
        ShelfSkeleton()
    }
}

// ---- the hero (HeroCard.tsx + HeroMobile.tsx + use-hero-slides.ts) ------------------------------------------

/** Offset of card i from the current one on a loop of count cards: the shortest way round */
fun loopOffset(i: Int, current: Int, count: Int): Int {
    val raw = ((i - current) % count + count) % count
    return if (raw > count / 2.0) raw - count else raw
}

@Composable
private fun HeroMobile(slides: List<AnimeItem>) {
    if (slides.isEmpty()) return
    val nav = LocalNav.current
    var index by rememberSaveable { mutableIntStateOf(0) }
    if (index >= slides.size) index = 0
    // restarts whenever the slide changes, so a manual pick gets its full interval
    LaunchedEffect(index, slides.size) {
        if (slides.size <= 1) return@LaunchedEffect
        delay(5000)
        index = (index + 1) % slides.size
    }
    val enriched = rememberLoad("enrich:${slides[index].slug}", staleMs = 30 * 60_000) { AnimeRepository.enrich(slides[index]) }
    val current = (enriched.value as? Load.Ok)?.value ?: slides[index]
    // the next slide's details fetched ahead, so the auto-advance finds them ready
    if (slides.size > 1) {
        val next = slides[(index + 1) % slides.size]
        rememberLoad("enrich:${next.slug}", staleMs = 30 * 60_000) { AnimeRepository.enrich(next) }
    }
    val hd = rememberHdArt(current)
    val image = hd?.cover ?: current.backdrop.ifEmpty { current.poster }
    val favorites by Library.favorites.collectAsState()
    val isFavorite = favorites.any { it.slug == current.slug }
    val scope = rememberCoroutineScope()
    val drag = remember { Animatable(0f) }

    Box(Modifier.padding(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 56.dp)) {
        Box(
            Modifier.fillMaxWidth().height(460.dp)
                .graphicsLayer { translationX = drag.value; compositingStrategy = CompositingStrategy.Offscreen }
                .clip(rounded(12.dp))
                .pointerInput(slides.size) {
                    if (slides.size <= 1) return@pointerInput
                    val tracker = VelocityTracker()
                    var total = 0f
                    detectHorizontalDragGestures(
                        onDragStart = { total = 0f; tracker.resetTracking() },
                        onDragEnd = {
                            val v = tracker.calculateVelocity().x
                            when {
                                total < -60.dp.toPx() || v < -500f -> index = (index + 1) % slides.size
                                total > 60.dp.toPx() || v > 500f -> index = (index - 1 + slides.size) % slides.size
                            }
                            scope.launch { drag.animateTo(0f, tween(300, easing = EaseIos)) }
                        },
                        onDragCancel = { scope.launch { drag.animateTo(0f) } },
                    ) { change, dx ->
                        total += dx
                        tracker.addPosition(change.uptimeMillis, change.position)
                        scope.launch { drag.snapTo(total * 0.22f) } // dragElastic 0.22
                    }
                },
        ) {
            Crossfade(image, animationSpec = tween(350), label = "hero-image") { url ->
                LazyImage(url, Modifier.fillMaxSize())
            }
            // the picture is full-bleed behind the text, so it is dimmed
            Box(Modifier.fillMaxSize().background(Capy.Card.copy(alpha = 0.7f)))
            HeroText(current, isFavorite, onPlay = { nav.watch(current.slug) }, onInfo = { nav.openTitle(current) })
        }
        if (slides.size > 1) HeroThumbs(slides, index, Modifier.align(Alignment.BottomCenter)) { index = it }
    }
}

private val metaBadge = Modifier.height(24.dp).clip(rounded(6.dp))

@Composable
private fun MetaBadge(text: String, border: Color = Color.White.copy(alpha = 0.7f), fg: Color = Color.White, bg: Color = Color.Transparent, bold: Boolean = false, star: Boolean = false) {
    Row(
        metaBadge.background(bg).border(1.dp, border, rounded(6.dp)).padding(horizontal = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (star) FIcon(LuFilled.Star, Modifier.padding(end = 4.dp), size = 12.dp, tint = fg)
        Text(text, color = fg, fontSize = 12.sp, lineHeight = 16.sp, fontWeight = if (bold) FontWeight.Bold else FontWeight.Medium, maxLines = 1)
    }
}

@Composable
private fun HeroText(item: AnimeItem, isFavorite: Boolean, onPlay: () -> Unit, onInfo: () -> Unit) {
    // every row has a fixed height and clips, so changing slide never moves the buttons
    Column(
        Modifier.fillMaxSize().padding(start = 24.dp, end = 24.dp, bottom = 48.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically),
    ) {
        Column {
            Text(
                item.title, color = Color.White, fontSize = 24.sp, lineHeight = 30.sp, fontWeight = FontWeight.Bold, maxLines = 2,
                overflow = TextOverflow.Ellipsis, modifier = Modifier.height(60.dp).wrapContentHeight(Alignment.Top, unbounded = true),
            )
            Text(
                item.subTitle, color = Capy.Amber, fontSize = 14.sp, lineHeight = 21.sp, maxLines = 1, overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(top = 6.dp).height(21.dp).wrapContentHeight(Alignment.Top, unbounded = true),
            )
        }
        Row(Modifier.height(24.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            fmtRating(item.rating)?.let { MetaBadge(it, border = Capy.Amber, fg = Capy.Amber, star = true) }
            MetaBadge(item.quality.ifBlank { "HD" }, border = Color.White, fg = Color.Black, bg = Color.White, bold = true)
            item.year?.let { MetaBadge("$it") }
            if (item.episode.isNotBlank()) MetaBadge(item.episode)
        }
        Row(Modifier.height(24.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            item.genres.take(4).forEach { g ->
                Box(metaBadge.background(Color.White.copy(alpha = 0.1f)).padding(horizontal = 8.dp), contentAlignment = Alignment.Center) {
                    Text(g, color = Color.White, fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium, maxLines = 1)
                }
            }
        }
        Text(
            item.synopsis, color = Color.White.copy(alpha = 0.9f), fontSize = 14.sp, lineHeight = 22.75.sp, maxLines = 3,
            overflow = TextOverflow.Ellipsis, modifier = Modifier.height(68.25.dp).wrapContentHeight(Alignment.Top, unbounded = true),
        )
        Row(Modifier.padding(top = 12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(24.dp)) {
            Box(
                Modifier.size(64.dp).pressable(pressedScale = 0.95f, onClick = onPlay)
                    .dropShadow(Capsule(), DropShadow(radius = 24.dp, color = Color(0x59FBBF24), offset = DpOffset(0.dp, 6.dp)))
                    .clip(Capsule()).background(Brush.linearGradient(listOf(Capy.Amber200, Capy.Amber400))),
                contentAlignment = Alignment.Center,
            ) { FIcon(LuFilled.Play, Modifier.offset(x = 2.dp), size = 24.dp, tint = Color.Black, label = "Xem ${item.title}") }
            Row(Modifier.clip(Capsule()).border(1.dp, Color.White.copy(alpha = 0.2f), Capsule()), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.height(48.dp).width(56.dp).pressable { Library.toggleFavorite(item) }, contentAlignment = Alignment.Center) {
                    if (isFavorite) FIcon(LuFilled.Heart, size = 20.dp, tint = Capy.Red, label = "Xóa khỏi danh sách của tôi")
                    else LIcon(Lu.Heart, size = 20.dp, label = "Thêm vào danh sách của tôi")
                }
                Box(Modifier.height(24.dp).width(1.dp).background(Color.White.copy(alpha = 0.2f)))
                Box(Modifier.height(48.dp).width(56.dp).pressable(onClick = onInfo), contentAlignment = Alignment.Center) {
                    LIcon(Lu.Info, size = 20.dp, label = "Thông tin chi tiết")
                }
            }
        }
    }
}

/** HeroMobile's picker: thumbnails loop around the picked one, which sits large in the middle */
@Composable
private fun HeroThumbs(slides: List<AnimeItem>, index: Int, modifier: Modifier, onPick: (Int) -> Unit) {
    Box(modifier.fillMaxWidth().height(112.dp).offset(y = 33.6.dp).clip(androidx.compose.ui.graphics.RectangleShape)) {
        slides.forEachIndexed { i, item ->
            val offset = loopOffset(i, index, slides.size)
            val distance = abs(offset)
            if (distance > 4) return@forEachIndexed
            // the big middle one needs more room than the rest
            val x = sign(offset.toFloat()) * (if (distance <= 1) distance * 60f else 60f + (distance - 1) * 52f)
            val spec = tween<Float>(500, easing = EaseIos)
            val tx by animateFloatAsState(x, spec, label = "x")
            val scale by animateFloatAsState(if (distance == 0) 1.45f else if (distance == 1) 1.05f else 0.9f, spec, label = "s")
            val alpha by animateFloatAsState(if (distance == 0) 1f else if (distance == 1) 0.9f else if (distance >= 4) 0f else 0.55f, spec, label = "a")
            val lift by animateDpAsState(if (distance == 0) (-4).dp else 0.dp, tween(500, easing = EaseIos), label = "y")
            val border = if (distance == 0) Color.White else if (distance == 1) Color.White.copy(alpha = 0.25f) else Color.Transparent
            val density = LocalDensity.current
            Box(
                Modifier.align(Alignment.BottomCenter).padding(bottom = 12.dp).zIndex(if (distance == 0) 10f else 0f)
                    .graphicsLayer {
                        translationX = with(density) { tx.dp.toPx() }
                        translationY = with(density) { lift.toPx() }
                        scaleX = scale; scaleY = scale; this.alpha = alpha
                        compositingStrategy = CompositingStrategy.ModulateAlpha
                        transformOrigin = TransformOrigin(0.5f, 1f)
                    }
                    .width(44.dp).aspectRatio(2f / 3f)
                    .then(if (distance == 0) Modifier.dropShadow(rounded(8.dp), DropShadow(radius = 28.dp, color = Color.Black.copy(alpha = 0.65f), offset = DpOffset(0.dp, 12.dp))) else Modifier)
                    .clip(rounded(8.dp)).background(Capy.Card).border(2.dp, border, rounded(8.dp))
                    .pressable(pressedScale = 1f) { onPick(i) },
            ) { LazyImage(item.poster, Modifier.fillMaxSize(), art = item) }
        }
    }
}

// ---- the ranked cover flow (StackCarousel.tsx + model/coverflow.ts) ------------------------------------------

private const val STEP = 0.92f
private const val FAN = 0.3f
private const val TURN = 48f
private const val DEPTH = 120f
private const val VISIBLE = 2

/** "02" from "TẬP 02" */
fun episodeNumber(item: AnimeItem) = item.episode.replace(Regex("^TẬP\\s*", RegexOption.IGNORE_CASE), "").trim()

/** "Phần 2" when the title names a part, otherwise null (part 1 is not worth saying) */
fun partLabel(item: AnimeItem): String? =
    Regex("(?:Season|Mùa|Phần|SS|Part)\\s*(\\d+|[IVXLCDM]+)", RegexOption.IGNORE_CASE).find(item.title)?.let { "Phần ${it.groupValues[1]}" }

@Composable
private fun StackCarousel(items: List<AnimeItem>) {
    if (items.isEmpty()) return
    val nav = LocalNav.current
    var index by rememberSaveable { mutableIntStateOf(0) }
    if (index >= items.size) index = 0
    val count = items.size
    val drag = remember { Animatable(0f) }
    val scope = rememberCoroutineScope()
    val go: (Int) -> Unit = { step ->
        // keep every card where it is, then let the drag settle to the new rest place
        scope.launch {
            drag.snapTo(drag.value + step)
            index = ((index + step) % count + count) % count
            drag.animateTo(0f, tween(460, easing = EaseIos))
        }
    }

    Column(Modifier.padding(horizontal = 16.dp)) {
        BoxWithConstraints(Modifier.fillMaxWidth()) {
            val screenW = maxWidth + 32.dp
            val cardW = min(screenW.value * 0.62f, 280f).dp
            val height = min(screenW.value * 0.93f, 420f).dp
            val density = LocalDensity.current
            val cardPx = with(density) { cardW.toPx() }
            Box(
                Modifier.fillMaxWidth().height(height).pointerInput(count) {
                    val tracker = VelocityTracker()
                    var total = 0f
                    detectHorizontalDragGestures(
                        onDragStart = { total = 0f; tracker.resetTracking() },
                        onDragEnd = {
                            val v = tracker.calculateVelocity().x / density.density / 1000f // px/ms like use-gesture
                            val flick = if (abs(v) > 0.35f) -sign(v).toInt() else 0
                            val step = if (abs(total) > cardPx * 0.2f) -sign(total).toInt() else flick
                            if (step == 0) scope.launch { drag.animateTo(0f, tween(460, easing = EaseIos)) } else go(step)
                        },
                        onDragCancel = { scope.launch { drag.animateTo(0f, tween(460, easing = EaseIos)) } },
                    ) { change, dx ->
                        total += dx
                        tracker.addPosition(change.uptimeMillis, change.position)
                        scope.launch { drag.snapTo(total / (cardPx * STEP)) }
                    }
                },
            ) {
                items.forEachIndexed { i, anime ->
                    val around = loopOffset(i, index, count)
                    if (abs(around) > VISIBLE + 1) return@forEachIndexed
                    CoverCard(anime, i == index, { around + drag.value }, cardW, Modifier.align(Alignment.TopCenter).zIndex(10f - min(abs(around), VISIBLE + 1))) {
                        if (i == index) nav.openTitle(anime) else go(around)
                    }
                }
                if (count > 1) {
                    ArrowButton(Lu.ChevronLeft, "Phim trước", Modifier.align(Alignment.CenterStart)) { go(-1) }
                    ArrowButton(Lu.ChevronRight, "Phim sau", Modifier.align(Alignment.CenterEnd)) { go(1) }
                }
            }
        }
        val current = items[index]
        Row(
            Modifier.align(Alignment.CenterHorizontally).padding(top = 12.dp).widthIn(max = 300.dp).padding(horizontal = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                "${index + 1}", color = Capy.Amber400, fontSize = 48.sp, lineHeight = 48.sp, fontWeight = FontWeight.Black, fontStyle = FontStyle.Italic,
                letterSpacing = (-2.4).sp,
                style = TextStyle(shadow = Shadow(Color(0x99FBBF24), blurRadius = 24f, offset = androidx.compose.ui.geometry.Offset(0f, 4f))),
            )
            Column(Modifier.padding(start = 12.dp).weight(1f)) {
                Text(current.title, color = Color.White, fontSize = 14.sp, lineHeight = 19.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                if (current.subTitle.isNotBlank() && current.subTitle != current.title)
                    Text(current.subTitle, color = Capy.TextDim, fontSize = 12.sp, lineHeight = 16.sp, fontStyle = FontStyle.Italic, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    partLabel(current)?.let {
                        Text(it, color = Capy.Gray300, fontSize = 11.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold)
                        Text(" • ", color = Capy.TextDim, fontSize = 11.sp, lineHeight = 16.sp)
                    }
                    val ep = episodeNumber(current)
                    Text(if (ep.isNotEmpty()) "Tập $ep" else "Tập mới", color = Capy.Red, fontSize = 11.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
        // the dots never change size; one pill slides over the current one
        Box(Modifier.align(Alignment.CenterHorizontally).padding(top = 12.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                repeat(count) { Box(Modifier.size(6.dp).clip(Capsule()).background(Color.White.copy(alpha = 0.3f))) }
            }
            val x by animateDpAsState((index * 12 - 7).dp, tween(300, easing = EaseIos), label = "dot")
            Box(Modifier.offset(x = x).width(20.dp).height(6.dp).clip(Capsule()).background(Color.White))
        }
    }
}

@Composable
private fun ArrowButton(icon: Int, label: String, modifier: Modifier, onClick: () -> Unit) {
    Box(modifier.zIndex(20f).size(44.dp).pressable(pressedScale = 0.9f, onClick = onClick).glassButton(), contentAlignment = Alignment.Center) {
        LIcon(icon, size = 20.dp, label = label)
    }
}

/** One card of the cover flow at a (fractional while dragging) offset: placed, turned and shaded continuously */
@Composable
private fun CoverCard(anime: AnimeItem, front: Boolean, offset: () -> Float, width: Dp, modifier: Modifier, onClick: () -> Unit) {
    val shape = rounded(8.dp)
    val ep = episodeNumber(anime)
    Box(
        modifier
            .graphicsLayer {
                val o = offset()
                val side = sign(o)
                val near = min(abs(o), 1f)
                val far = max(abs(o) - 1f, 0f)
                val w = size.width
                translationX = side * (near * STEP + far * FAN) * w
                val z = (near + far * 0.6f) * DEPTH * density
                // translateZ in a 1000 px perspective: further away, smaller
                compositingStrategy = CompositingStrategy.Offscreen // turned and moved as one cached picture
                val k = 1000f * density / (1000f * density + z)
                scaleX = k; scaleY = k
                rotationY = -side * near * TURN
                // perspective: 1000px; the RenderNode camera distance counts in units of 72 px
                cameraDistance = 1000f * density / 72f
                alpha = if (min(abs(o), VISIBLE + 1f) > VISIBLE + 0.4f) 0f else 1f
            }
            .width(width).aspectRatio(2f / 3f)
            .then(
                if (front) Modifier.dropShadow(shape, DropShadow(radius = 44.dp, color = Color.Black.copy(alpha = 0.8f), spread = (-10).dp, offset = DpOffset(0.dp, 22.dp)))
                else Modifier.dropShadow(shape, DropShadow(radius = 20.dp, color = Color.Black.copy(alpha = 0.55f), offset = DpOffset(0.dp, 10.dp))),
            )
            .clip(shape)
            .border(1.dp, Color.White.copy(alpha = if (front) 0.22f else 0.1f), shape)
            .pressable(pressedScale = 1f, onClick = onClick),
    ) {
        LazyImage(anime.poster, Modifier.fillMaxSize(), art = anime)
        // cards behind the middle one sink into the dark
        Box(Modifier.fillMaxSize().drawBehind { drawRect(Color.Black.copy(alpha = min(min(abs(offset()), VISIBLE.toFloat()) * 0.42f, 0.78f))) })
        val rim by animateFloatAsState(if (front) 1f else 0f, tween(420), label = "rim")
        Box(Modifier.fillMaxSize().graphicsLayer { alpha = rim; compositingStrategy = CompositingStrategy.ModulateAlpha }.glassRim(shape))
        Row(Modifier.align(Alignment.BottomEnd).padding(12.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            CoverBadge("PĐ. ${ep.ifEmpty { "Full" }}", Color(0xE6202020), Color.White.copy(alpha = 0.15f), Capy.Gray200)
            CoverBadge("TM. ${ep.ifEmpty { "HD" }}", Capy.Emerald600.copy(alpha = 0.9f), Color(0x4D34D399), Color.White)
        }
    }
}

@Composable
private fun CoverBadge(text: String, bg: Color, border: Color, fg: Color) = Text(
    text, color = fg, fontSize = 11.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold, maxLines = 1,
    modifier = Modifier.clip(rounded(4.dp)).background(bg).border(1.dp, border, rounded(4.dp)).padding(horizontal = 8.dp, vertical = 2.dp),
)
