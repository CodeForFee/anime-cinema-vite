package app.capynime.compose.ui.common

import androidx.compose.animation.core.snap
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.capynime.compose.data.AnimeItem
import app.capynime.compose.data.HdArt
import app.capynime.compose.data.Library
import app.capynime.compose.ui.FIcon
import app.capynime.compose.ui.LIcon
import app.capynime.compose.ui.Lu
import app.capynime.compose.ui.LuFilled
import app.capynime.compose.ui.glass.cardLift
import app.capynime.compose.ui.glass.glassPill
import app.capynime.compose.ui.glass.glassRim
import app.capynime.compose.ui.glass.cached
import app.capynime.compose.ui.glass.pressable
import app.capynime.compose.ui.glass.rounded
import app.capynime.compose.ui.theme.Capy
import coil3.compose.AsyncImage
import app.capynime.compose.ui.glass.Capsule

/** The web's Skeleton: a bg-white/10 block with a light sweeping across */
@Composable
fun Skeleton(modifier: Modifier = Modifier, corner: Dp = 6.dp) {
    // a weak phone keeps the block still: a sweep is a redraw every frame for as long as pictures load
    if (Device.lite) return Box(modifier.clip(rounded(corner)).background(Color.White.copy(alpha = 0.1f)))
    val t = rememberInfiniteTransition(label = "shimmer")
    val x by t.animateFloat(-1f, 1f, infiniteRepeatable(tween(1500, easing = LinearEasing), RepeatMode.Restart), label = "x")
    Box(
        modifier.clip(rounded(corner)).background(Color.White.copy(alpha = 0.1f)).drawWithCache {
            val w = size.width
            val sweep = Brush.horizontalGradient(listOf(Color.Transparent, Color.White.copy(alpha = 0.06f), Color.Transparent), 0f, w)
            onDrawBehind {
                drawContext.transform.translate(w * x, 0f)
                drawRect(sweep)
                drawContext.transform.translate(-w * x, 0f)
            }
        },
    )
}

/** The title's AniList art once known (hooks/useHdArt.ts); asks for it the first time the title is drawn */
@Composable
fun rememberHdArt(item: AnimeItem?): HdArt.Art? {
    val key = item?.let { it.slug.ifEmpty { it.poster } }.orEmpty()
    if (key.isEmpty()) return null
    val art by remember(key) { HdArt.art(key) }.collectAsState()
    LaunchedEffect(key) { HdArt.request(item!!) }
    return art
}

/** Pictures already shown this session (LazyImage.tsx `shown`). ponytail: grows with every poster seen, a few KB of URLs */
private val shown: MutableSet<String> = java.util.Collections.newSetFromMap(java.util.concurrent.ConcurrentHashMap())

/**
 * LazyImage.tsx: a skeleton until the picture has loaded, then it fades in; the title's sharp AniList cover
 * replaces the source poster once found (drawn over it when it arrives, so the card never blanks).
 */
@Composable
fun LazyImage(src: String, modifier: Modifier = Modifier, art: AnimeItem? = null, contentScale: ContentScale = ContentScale.Crop) {
    val hd = rememberHdArt(art)?.cover
    // the cover known before the first frame takes the source poster's place; one found later lands over it
    val hdFirst = remember(art?.slug) { hd != null }
    // shown before (scrolled back into view): in place at once, no skeleton and no fade to redraw the card for
    var baseLoaded by remember(src) { mutableStateOf(src in shown) }
    var hdLoaded by remember(hd) { mutableStateOf(hd != null && hd in shown) }
    var hdFailed by remember(hd) { mutableStateOf(false) }
    Box(modifier) {
        val showBase = !hdFirst || hd == null || hdFailed
        if (!(baseLoaded && showBase) && !hdLoaded) Skeleton(Modifier.matchParentSize(), 0.dp)
        if (showBase && src.isNotEmpty())
            AsyncImage(src, null, Modifier.matchParentSize(), contentScale = contentScale, onSuccess = { shown += src; baseLoaded = true }, onError = { baseLoaded = true })
        if (hd != null && !hdFailed) {
            val seen = remember(hd) { hd in shown }
            val alpha by animateFloatAsState(if (hdLoaded) 1f else 0f, if (Device.lite || seen) snap() else tween(300), label = "hd")
            AsyncImage(
                hd, null, Modifier.matchParentSize().graphicsLayer { this.alpha = alpha; compositingStrategy = CompositingStrategy.ModulateAlpha }, contentScale = contentScale,
                onSuccess = { shown += hd; hdLoaded = true }, onError = { hdFailed = true },
            )
        }
    }
}

/** "8.3", "9" (the source's own numbers) */
fun fmtRating(r: Double?): String? = r?.let { if (it % 1.0 == 0.0) it.toInt().toString() else "%.1f".format(it).trimEnd('0').trimEnd('.') }

/** The corner badge the web's PosterTile shows */
fun tileBadge(item: AnimeItem): String? = when {
    item.isUpcoming -> "Sắp chiếu"
    item.rank != null -> "#${item.rank}"
    else -> item.episode.ifBlank { item.quality }.ifBlank { null }
}

/**
 * PosterTile.tsx: the art fills the tile, title and facts sit on a frosted strip over it, heart in the corner.
 * Tapping opens the title's preview.
 */
@Composable
fun PosterTile(item: AnimeItem, modifier: Modifier = Modifier, onClick: () -> Unit) {
    val favorites by Library.favorites.collectAsState()
    val isFavorite = favorites.any { it.slug == item.slug }
    val shape = rounded(8.dp)
    Box(modifier.aspectRatio(2f / 3f).cached()) {
        Box(Modifier.matchParentSize().pressable(onClick = onClick).cardLift(shape).clip(shape)) {
            LazyImage(item.poster, Modifier.matchParentSize(), art = item)
            tileBadge(item)?.let { badge ->
                Text(
                    badge, color = Color.White, fontSize = 11.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold, maxLines = 1,
                    modifier = Modifier.align(Alignment.TopStart).padding(8.dp).clip(rounded(8.dp)).background(Color.Black.copy(alpha = 0.6f))
                        .border(1.dp, Color.White.copy(alpha = 0.15f), rounded(8.dp)).padding(horizontal = 8.dp, vertical = 2.dp),
                )
            }
            Column(
                Modifier.align(Alignment.BottomCenter).padding(8.dp).fillMaxWidth().posterCaption().padding(horizontal = 10.dp, vertical = 8.dp),
            ) {
                Text(item.title, color = Color.White, fontSize = 14.sp, lineHeight = 17.5.sp, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                val rating = fmtRating(item.rating)
                if (item.year != null || rating != null) Row(Modifier.padding(top = 4.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    item.year?.let { Text("$it", color = Capy.Gray300, fontSize = 12.sp, lineHeight = 16.sp) }
                    if (rating != null) Row(verticalAlignment = Alignment.CenterVertically) {
                        FIcon(LuFilled.Star, size = 12.dp, tint = Capy.Amber400)
                        Text(rating, color = Capy.Gray300, fontSize = 12.sp, lineHeight = 16.sp, modifier = Modifier.padding(start = 2.dp))
                    }
                }
            }
            Box(Modifier.matchParentSize().glassRim(shape))
        }
        Box(
            Modifier.align(Alignment.TopEnd).padding(8.dp).size(36.dp).pressable(pressedScale = 0.9f) { Library.toggleFavorite(item) }.glassPill(),
            contentAlignment = Alignment.Center,
        ) {
            if (isFavorite) FIcon(LuFilled.Heart, size = 16.dp, tint = Capy.Red, label = "Bỏ khỏi danh sách")
            else LIcon(Lu.Heart, size = 16.dp, label = "Lưu")
        }
    }
}

/** .poster-caption: glass made of a tint and a light edge, no blur */
fun Modifier.posterCaption() = clip(rounded(8.dp))
    .drawWithCache {
        val b = Brush.verticalGradient(listOf(Color(20, 20, 26).copy(alpha = 0.45f), Color(10, 10, 14).copy(alpha = 0.78f)))
        onDrawBehind {
            drawRect(b)
            drawLine(Color.White.copy(alpha = 0.18f), Offset(8.dp.toPx(), 0.5f), Offset(size.width - 8.dp.toPx(), 0.5f), 1.dp.toPx())
        }
    }
    .border(1.dp, Color.White.copy(alpha = 0.15f), rounded(8.dp))

/** "Xem tất cả ›" (.glass-pill h-8 pl-3.5 pr-2.5 text-xs) */
@Composable
fun SeeAllPill(onClick: () -> Unit) {
    Row(
        Modifier.height(32.dp).pressable(onClick = onClick).glassPill().padding(start = 14.dp, end = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text("Xem tất cả", color = Capy.Gray200, fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold)
        LIcon(Lu.ChevronRight, Modifier.padding(start = 4.dp), size = 14.dp, tint = Capy.Gray200)
    }
}

/** A shelf heading: the title and, when the list continues on the explore page, "Xem tất cả" */
@Composable
fun ShelfHeader(title: String, modifier: Modifier = Modifier, onSeeAll: (() -> Unit)? = null) {
    Row(modifier.fillMaxWidth().padding(horizontal = 16.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(title, color = Color.White, fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.Bold, letterSpacing = (-0.45).sp, modifier = Modifier.weight(1f))
        if (onSeeAll != null) SeeAllPill(onSeeAll)
    }
}

/** MovieShelf.tsx: the heading, then a row of w-44 tiles (my-5, gap-3) */
@Composable
fun MovieShelf(title: String, items: List<AnimeItem>, onOpen: (AnimeItem) -> Unit, onSeeAll: (() -> Unit)? = null) {
    if (items.isEmpty()) return
    Column(Modifier.row().padding(vertical = 20.dp)) {
        ShelfHeader(title, Modifier.padding(bottom = 12.dp), onSeeAll)
        LazyRow(state = smoothListState(), contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            items(items, key = { it.slug + it.episode }) { item -> PosterTile(item, Modifier.width(176.dp)) { onOpen(item) } }
        }
    }
}

/** skeletons.tsx ShelfSkeleton */
@Composable
fun ShelfSkeleton(modifier: Modifier = Modifier) {
    Column(modifier.padding(horizontal = 16.dp, vertical = 20.dp)) {
        Skeleton(Modifier.width(224.dp).height(28.dp))
        Row(Modifier.padding(top = 12.dp), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            repeat(3) { Skeleton(Modifier.width(176.dp).aspectRatio(2f / 3f), 8.dp) }
        }
    }
}

/** A grid of poster placeholders (explore, search) */
@Composable
fun PosterGridSkeleton(count: Int = 6, modifier: Modifier = Modifier) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(32.dp)) {
        repeat((count + 1) / 2) {
            Row(horizontalArrangement = Arrangement.spacedBy(20.dp)) {
                repeat(2) { Skeleton(Modifier.weight(1f).aspectRatio(2f / 3f), 8.dp) }
            }
        }
    }
}

/** The page heading of the web's tab pages (text-3xl font-bold) */
@Composable
fun PageTitle(text: String, modifier: Modifier = Modifier) =
    Text(text, color = Color.White, fontSize = 30.sp, lineHeight = 36.sp, fontWeight = FontWeight.Bold, letterSpacing = (-0.75).sp, modifier = modifier)

/** The solid white pill of the web's primary actions */
@Composable
fun WhiteButton(text: String, modifier: Modifier = Modifier, icon: Int? = null, enabled: Boolean = true, height: Dp = 44.dp, onClick: () -> Unit) {
    Row(
        modifier.height(height).pressable(enabled = enabled, onClick = onClick).clip(Capsule())
            .background(if (enabled) Color.White else Color.White.copy(alpha = 0.5f)).padding(horizontal = 20.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
    ) {
        if (icon != null) LIcon(icon, size = 18.dp, tint = Color.Black)
        Text(text, color = Color.Black, fontSize = 15.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold, maxLines = 1)
    }
}

/** A choice chip of the explore / schedule pages: the picked one solid white, the others glass */
@Composable
fun Chip(text: String, selected: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Box(
        modifier.height(40.dp).pressable(onClick = onClick)
            .then(if (selected) Modifier.clip(Capsule()).background(Color.White) else Modifier.glassPill())
            .padding(horizontal = 18.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(text, color = if (selected) Color.Black else Color.White, fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
    }
}

/** Failed to load: one line, one way out */
@Composable
fun ErrorBox(message: String, modifier: Modifier = Modifier, onRetry: () -> Unit) {
    Column(modifier.fillMaxWidth().padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        LIcon(Lu.Alert, size = 40.dp, tint = Capy.Red)
        Text(message, color = Capy.Gray300, fontSize = 14.sp, lineHeight = 20.sp, textAlign = TextAlign.Center, modifier = Modifier.padding(vertical = 12.dp))
        WhiteButton("Thử lại", icon = Lu.Refresh, height = 40.dp, onClick = onRetry)
    }
}

/** Loading / error / content for one [Loaded] */
@Composable
fun <T> LoadBox(loaded: Loaded<T>, modifier: Modifier = Modifier, skeleton: @Composable () -> Unit = { ShelfSkeleton() }, content: @Composable BoxScope.(T) -> Unit) {
    Box(modifier) {
        when (val s = loaded.value) {
            is Load.Loading -> skeleton()
            is Load.Failed -> ErrorBox(s.message) { loaded.retry() }
            is Load.Ok -> content(s.value)
        }
    }
}

fun timeAgo(ms: Long): String {
    val s = (System.currentTimeMillis() - ms) / 1000
    return when {
        s < 60 -> "Vừa xong"
        s < 3600 -> "${s / 60} phút trước"
        s < 86400 -> "${s / 3600} giờ trước"
        else -> "${s / 86400} ngày trước"
    }
}
