package app.capynime.compose.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import app.capynime.compose.ui.theme.Ink
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
import app.capynime.compose.data.HomeSnapshot
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
    val home = rememberLoad("home", stale = HomeSnapshot::home) { AnimeRepository.home() }
    val nav = LocalNav.current
    LoadBox(home, Modifier.fillMaxSize(), skeleton = { HomeSkeleton() }) { data ->
        // the ranked list: this season's slider, else the featured titles, else the latest
        val ranked = listOf(data.featured, data.nominate, data.latest).firstOrNull { it.isNotEmpty() }.orEmpty()
        LazyColumn(state = smoothListState(), contentPadding = PaddingValues(bottom = dockPadding() + 64.dp)) {
            item("hero") { Box(Modifier.row()) { HeroBanner(ranked.take(8)) } }
            if (ranked.isNotEmpty()) item("ranked") {
                Column(Modifier.row().padding(top = 6.dp, bottom = 8.dp)) {
                    ShelfHeader("Top Đề Cử", Modifier.padding(bottom = 8.dp)) { nav.explore() }
                    TopRow(ranked.take(10))
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
            Skeleton(Modifier.fillMaxWidth().height(HERO_HEIGHT), 20.dp)
        }
        ShelfSkeleton(Modifier.padding(top = 12.dp))
        ShelfSkeleton()
    }
}

// ---- the hero: a banner pager --------------------------------------------------------------------------------

private val HERO_HEIGHT = 420.dp

/**
 * A full-width banner per title, swiped (or advanced every 6 s) by the platform pager: one page drawn at a time,
 * no per-card animations. The settled page's details (genres, synopsis, HD cover) are fetched as it shows.
 */
@Composable
private fun HeroBanner(slides: List<AnimeItem>) {
    if (slides.isEmpty()) return
    val nav = LocalNav.current
    val pager = rememberPagerState { slides.size }
    LaunchedEffect(pager.settledPage, slides.size) {
        if (slides.size <= 1) return@LaunchedEffect
        delay(6000)
        pager.animateScrollToPage((pager.settledPage + 1) % slides.size, animationSpec = tween(450, easing = EaseIos))
    }
    Column(Modifier.padding(top = 8.dp, bottom = 12.dp)) {
        HorizontalPager(
            pager, Modifier.fillMaxWidth().height(HERO_HEIGHT),
            contentPadding = PaddingValues(horizontal = 16.dp), pageSpacing = 10.dp, key = { slides[it].slug.ifEmpty { "$it" } },
        ) { page ->
            HeroPage(slides[page], page + 1, active = page == pager.settledPage, onPlay = { nav.watch(it.slug) }, onInfo = nav.openTitle)
        }
        if (slides.size > 1) Row(
            Modifier.align(Alignment.CenterHorizontally).padding(top = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(5.dp), verticalAlignment = Alignment.CenterVertically,
        ) {
            repeat(slides.size) { i ->
                val on = i == pager.currentPage
                Box(Modifier.width(if (on) 18.dp else 5.dp).height(5.dp).clip(Capsule()).background(if (on) Capy.Red else Color.White.copy(alpha = 0.25f)))
            }
        }
    }
}

@Composable
private fun HeroPage(item: AnimeItem, rank: Int, active: Boolean, onPlay: (AnimeItem) -> Unit, onInfo: (AnimeItem) -> Unit) {
    // only the page on screen asks for its details; the neighbours show what the list already knows
    val enriched = if (active) rememberLoad("enrich:${item.slug}", staleMs = 30 * 60_000) { AnimeRepository.enrich(item) } else null
    val current = (enriched?.value as? Load.Ok)?.value ?: item
    val favorites by Library.favorites.collectAsState()
    val isFavorite = favorites.any { it.slug == current.slug }
    val hd = rememberHdArt(current)
    Box(Modifier.fillMaxSize().clip(rounded(20.dp)).background(Ink.Card).clickable { onInfo(current) }) {
        LazyImage(hd?.cover ?: current.poster.ifEmpty { current.backdrop }, Modifier.fillMaxSize())
        // one fill: the picture fades into the card colour under the text
        Box(Modifier.fillMaxSize().drawBehind {
            val h = size.height * 0.62f
            drawRect(
                Brush.verticalGradient(0f to Color.Transparent, 0.45f to Ink.Card.copy(alpha = 0.75f), 1f to Ink.Card, startY = size.height - h, endY = size.height),
                topLeft = androidx.compose.ui.geometry.Offset(0f, size.height - h),
            )
        })
        Column(Modifier.align(Alignment.BottomStart).fillMaxWidth().padding(18.dp)) {
            Text("#$rank Đề cử", color = Capy.Red, fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.4.sp)
            Text(
                current.title, color = Color.White, fontSize = 24.sp, lineHeight = 29.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = (-0.4).sp,
                maxLines = 2, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 4.dp),
            )
            val facts = listOfNotNull(
                current.year?.toString(), current.episode.ifBlank { null }, current.quality.ifBlank { null },
            ) + current.genres.take(2)
            Row(Modifier.padding(top = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                fmtRating(current.rating)?.let {
                    FIcon(LuFilled.Star, size = 13.dp, tint = Capy.Gold)
                    Text(it, color = Capy.Gold, fontSize = 13.sp, lineHeight = 18.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(start = 3.dp, end = 8.dp))
                }
                Text(facts.joinToString("  ·  "), color = Capy.Gray300, fontSize = 13.sp, lineHeight = 18.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            Row(Modifier.padding(top = 14.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(
                    Modifier.height(44.dp).clip(Capsule()).background(Capy.Red).clickable { onPlay(current) }.padding(horizontal = 20.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    FIcon(LuFilled.Play, size = 16.dp, tint = Color.White, label = "Xem ${current.title}")
                    Text("Xem ngay", color = Color.White, fontSize = 15.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 8.dp))
                }
                Row(
                    Modifier.height(44.dp).clip(Capsule()).background(Ink.Raised).clickable { onInfo(current) }.padding(horizontal = 18.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    LIcon(Lu.Info, size = 16.dp, label = "Thông tin chi tiết")
                    Text("Chi tiết", color = Color.White, fontSize = 15.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(start = 8.dp))
                }
                Box(Modifier.size(44.dp).clip(Capsule()).background(Ink.Raised).clickable { Library.toggleFavorite(current) }, contentAlignment = Alignment.Center) {
                    if (isFavorite) FIcon(LuFilled.Heart, size = 18.dp, tint = Capy.Red, label = "Xóa khỏi danh sách của tôi")
                    else LIcon(Lu.Heart, size = 18.dp, label = "Thêm vào danh sách của tôi")
                }
            }
        }
    }
}

// ---- top row: big outlined rank numbers beside posters -----------------------------------------------------------

/** "02" from "TẬP 02" */
fun episodeNumber(item: AnimeItem) = item.episode.replace(Regex("^TẬP\\s*", RegexOption.IGNORE_CASE), "").trim()

private val rankStyle = TextStyle(
    fontSize = 96.sp, lineHeight = 96.sp, fontWeight = FontWeight.Black, letterSpacing = (-6).sp,
    drawStyle = androidx.compose.ui.graphics.drawscope.Stroke(width = 4f),
)

@Composable
private fun TopRow(items: List<AnimeItem>) {
    val nav = LocalNav.current
    LazyRow(state = smoothListState(), contentPadding = PaddingValues(horizontal = 12.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        itemsIndexed(items, key = { _, it -> it.slug.ifEmpty { it.title } }) { index, item ->
            Box(Modifier.width(176.dp).height(176.dp).clip(rounded(12.dp)).clickable { nav.openTitle(item) }) {
                Text("${index + 1}", style = rankStyle, color = Color.White.copy(alpha = 0.55f), modifier = Modifier.align(Alignment.BottomStart).offset(y = 10.dp))
                Box(Modifier.align(Alignment.CenterEnd).width(112.dp).aspectRatio(2f / 3f).clip(rounded(12.dp)).background(Ink.Raised)) {
                    LazyImage(item.poster, Modifier.fillMaxSize())
                    val ep = episodeNumber(item)
                    if (ep.isNotEmpty()) Text(
                        "Tập $ep", color = Color.White, fontSize = 10.sp, lineHeight = 14.sp, fontWeight = FontWeight.Bold,
                        modifier = Modifier.align(Alignment.BottomStart).padding(6.dp).clip(rounded(6.dp)).background(Color.Black.copy(alpha = 0.65f)).padding(horizontal = 6.dp, vertical = 1.dp),
                    )
                }
            }
        }
    }
}
