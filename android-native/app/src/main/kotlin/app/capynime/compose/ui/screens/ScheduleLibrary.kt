package app.capynime.compose.ui.screens

import app.capynime.compose.ui.common.smoothGridState
import app.capynime.compose.ui.common.smoothListState
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import app.capynime.compose.ui.glass.dropShadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.DpOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.capynime.compose.data.AnimeItem
import app.capynime.compose.data.AnimeRepository
import app.capynime.compose.data.HistoryEntry
import app.capynime.compose.data.Library
import app.capynime.compose.ui.FIcon
import app.capynime.compose.ui.LIcon
import app.capynime.compose.ui.LocalNav
import app.capynime.compose.ui.Lu
import app.capynime.compose.ui.LuFilled
import app.capynime.compose.ui.common.LazyImage
import app.capynime.compose.ui.common.Load
import app.capynime.compose.ui.common.PageTitle
import app.capynime.compose.ui.common.PosterTile
import app.capynime.compose.ui.common.Skeleton
import app.capynime.compose.ui.common.WhiteButton
import app.capynime.compose.ui.common.fmtRating
import app.capynime.compose.ui.common.rememberLoad
import app.capynime.compose.ui.common.timeAgo
import app.capynime.compose.ui.dockPadding
import app.capynime.compose.ui.glass.cardLift
import app.capynime.compose.ui.glass.glassCard
import app.capynime.compose.ui.glass.glassPill
import app.capynime.compose.ui.glass.glassRim
import app.capynime.compose.ui.glass.cached
import app.capynime.compose.ui.glass.pressable
import app.capynime.compose.ui.glass.rounded
import app.capynime.compose.ui.theme.Capy
import app.capynime.compose.ui.glass.Capsule
import kotlinx.coroutines.delay
import java.util.Calendar
import androidx.compose.ui.graphics.shadow.Shadow as DropShadow

private val SHORT = mapOf("thứ hai" to "T2", "thứ ba" to "T3", "thứ tư" to "T4", "thứ năm" to "T5", "thứ sáu" to "T6", "thứ bảy" to "T7", "chủ nhật" to "CN")

/** "Còn 4 giờ 12 phút" / "Còn 2 ngày 3 giờ", null once aired (features/schedule/model/schedule.ts untilAir) */
fun untilAir(at: Long?, now: Long): String? {
    if (at == null || at <= now) return null
    val minutes = ((at - now) / 60_000.0).let { kotlin.math.ceil(it).toLong() }
    val days = minutes / 1440
    val hours = (minutes % 1440) / 60
    return when {
        days > 0 -> "Còn $days ngày" + if (hours > 0) " $hours giờ" else ""
        hours > 0 -> "Còn $hours giờ ${minutes % 60} phút"
        else -> "Còn $minutes phút"
    }
}

/** SchedulePage.tsx: the source's week of new episodes, one day at a time */
@Composable
fun ScheduleScreen() {
    val schedule = rememberLoad("schedule", staleMs = 15 * 60_000) { AnimeRepository.schedule() }
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(Unit) { while (true) { delay(60_000); now = System.currentTimeMillis() } }
    val days = (schedule.value as? Load.Ok)?.value.orEmpty()
    val loading = schedule.value is Load.Loading
    val today = remember(days) {
        val c = Calendar.getInstance()
        days.indexOfFirst { it.date == "%02d/%02d".format(c.get(Calendar.DAY_OF_MONTH), c.get(Calendar.MONTH) + 1) }
    }
    var picked by rememberSaveable { mutableIntStateOf(-1) }
    val index = if (picked in days.indices) picked else today.coerceAtLeast(0)
    val day = days.getOrNull(index)
    val items = day?.items.orEmpty().sortedBy { it.airTime }
    val total = days.sumOf { it.items.size }

    LazyColumn(
        state = smoothListState(),
        contentPadding = PaddingValues(top = 16.dp, bottom = dockPadding() + 24.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        item("head") {
            Column(Modifier.padding(horizontal = 16.dp)) {
                PageTitle("Lịch chiếu")
                Text(
                    if (total > 0) "$total tập mới trong tuần · giờ Việt Nam" else "Tập mới trong tuần · giờ Việt Nam",
                    color = Capy.TextDim, fontSize = 14.sp, lineHeight = 20.sp, modifier = Modifier.padding(top = 4.dp),
                )
            }
        }
        item("days") {
            LazyRow(contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (loading) items(7) { Skeleton(Modifier.width(64.dp).height(56.dp), 8.dp) }
                else itemsIndexed(days) { i, d ->
                    val selected = i == index
                    Column(
                        Modifier.height(56.dp).widthIn(min = 64.dp).pressable(pressedScale = 0.95f) { picked = i }
                            .then(
                                if (selected) Modifier.dropShadow(rounded(8.dp), DropShadow(radius = 15.dp, color = Color.Black.copy(alpha = 0.25f), offset = DpOffset(0.dp, 10.dp)))
                                    .clip(rounded(8.dp)).background(Color.White)
                                else Modifier.glassPill(rounded(8.dp)),
                            )
                            .padding(horizontal = 12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center,
                    ) {
                        Text(
                            if (i == today) "Hôm nay" else SHORT[d.weekday.lowercase()] ?: d.weekday.take(3),
                            color = if (selected) Color.Black else Capy.Gray200, fontSize = 14.sp, lineHeight = 14.sp, fontWeight = FontWeight.Bold,
                        )
                        Text(
                            "${d.date} · ${d.items.size}", color = if (selected) Color.Black.copy(alpha = 0.6f) else Capy.TextDim,
                            fontSize = 11.sp, lineHeight = 16.sp, modifier = Modifier.padding(top = 4.dp),
                        )
                    }
                }
            }
        }
        if (day != null) item("day") {
            Text(
                buildAnnotatedString {
                    append(day.weekday)
                    withStyle(SpanStyle(color = Capy.TextDim, fontSize = 16.sp, fontWeight = FontWeight.Medium)) { append("  ${day.date}") }
                },
                color = Color.White, fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.Bold, letterSpacing = (-0.45).sp,
                modifier = Modifier.padding(horizontal = 16.dp),
            )
        }
        if (loading) items(4) { Skeleton(Modifier.padding(horizontal = 16.dp).fillMaxWidth().height(116.dp), 12.dp) }
        if (schedule.value is Load.Failed) item("error") {
            Column(Modifier.padding(horizontal = 16.dp).fillMaxWidth().glassCard().padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                LIcon(Lu.Alert, size = 48.dp, tint = Capy.Red)
                Text("Chưa tải được lịch chiếu.", color = Capy.Gray300, fontSize = 14.sp, modifier = Modifier.padding(vertical = 16.dp))
                WhiteButton("Thử lại", icon = Lu.RotateCw, height = 40.dp) { schedule.retry() }
            }
        }
        if (day != null && items.isEmpty()) item("none") {
            Row(Modifier.padding(horizontal = 16.dp).fillMaxWidth().glassCard().padding(24.dp), verticalAlignment = Alignment.CenterVertically) {
                LIcon(Lu.Calendar, size = 20.dp, tint = Capy.TextDim)
                Text("Ngày này chưa có tập mới.", color = Capy.TextDim, fontSize = 14.sp, modifier = Modifier.padding(start = 12.dp))
            }
        }
        items(items, key = { "${it.slug}-${it.airTime}" }) { ScheduleRow(it, now, Modifier.padding(horizontal = 16.dp)) }
    }
}

/** ScheduleRow.tsx: poster, air time, name, and the time left until it airs */
@Composable
private fun ScheduleRow(anime: AnimeItem, now: Long, modifier: Modifier) {
    val nav = LocalNav.current
    val left = untilAir(anime.airAt, now)
    val aired = anime.airAt != null && left == null
    Row(
        modifier.fillMaxWidth().pressable(pressedScale = 0.98f) { nav.openTitle(anime) }.cached().glassCard().padding(start = 12.dp, top = 12.dp, bottom = 12.dp, end = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        SmallPoster(anime.poster, anime)
        Column(Modifier.padding(start = 16.dp).weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(anime.airTime.ifEmpty { "--:--" }, color = if (aired) Capy.TextFaint else Color.White, fontSize = 20.sp, lineHeight = 28.sp, fontWeight = FontWeight.Bold)
                if (anime.episode.isNotBlank()) Text(
                    anime.episode, color = Capy.Gray200, fontSize = 11.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(start = 8.dp).glassPill().padding(horizontal = 8.dp, vertical = 2.dp),
                )
            }
            Text(anime.title, color = Color.White, fontSize = 16.sp, lineHeight = 24.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 2.dp))
            Row(Modifier.padding(top = 2.dp), verticalAlignment = Alignment.CenterVertically) {
                fmtRating(anime.rating)?.let {
                    FIcon(LuFilled.Star, size = 12.dp, tint = Capy.Amber400)
                    Text(it, color = Capy.TextDim, fontSize = 12.sp, lineHeight = 16.sp, modifier = Modifier.padding(start = 2.dp, end = 8.dp))
                }
                anime.year?.let { Text("$it", color = Capy.TextDim, fontSize = 12.sp, lineHeight = 16.sp) }
            }
            Row(Modifier.padding(top = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                val c = if (left != null) Capy.Red else Capy.TextFaint
                LIcon(Lu.Clock, size = 12.dp, tint = c)
                Text(left ?: if (aired) "Đã ra tập" else "Chưa rõ giờ", color = c, fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(start = 4.dp))
            }
        }
    }
}

/** The 64x92 poster of history and schedule rows: card-lift, glass rim */
@Composable
private fun SmallPoster(src: String, art: AnimeItem?, progress: Float? = null, modifier: Modifier = Modifier) {
    val shape = rounded(8.dp)
    Box(modifier.width(64.dp).height(92.dp).cardLift(shape).clip(shape).background(Color.White.copy(alpha = 0.05f))) {
        if (src.isNotEmpty()) LazyImage(src, Modifier.fillMaxSize(), art = art)
        Box(Modifier.fillMaxSize().glassRim(shape))
        if (progress != null) Box(Modifier.align(Alignment.BottomStart).fillMaxWidth().height(4.dp).background(Color.Black.copy(alpha = 0.5f))) {
            Box(Modifier.fillMaxWidth(progress).fillMaxHeight().background(Capy.Red))
        }
    }
}

/** EmptyShelf.tsx: a row of glass poster outlines where the titles will go, one line, one way out */
@Composable
private fun EmptyShelf(line: String, hint: String) {
    val nav = LocalNav.current
    Column(verticalArrangement = Arrangement.spacedBy(20.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            repeat(3) { i -> Box(Modifier.weight(1f).aspectRatio(2f / 3f).graphicsLayer { alpha = 1f - i * 0.16f; compositingStrategy = CompositingStrategy.ModulateAlpha }.glassCard(rounded(8.dp))) }
        }
        Column {
            Text(line, color = Color.White, fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.SemiBold)
            Text(hint, color = Capy.TextDim, fontSize = 14.sp, lineHeight = 20.sp, modifier = Modifier.padding(top = 4.dp))
            Text(
                "Khám phá phim", color = Color.White, fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold,
                textDecoration = TextDecoration.Underline, modifier = Modifier.pressable { nav.tab("explore") },
            )
        }
    }
}

/** FavoritesPage.tsx */
@Composable
fun FavoritesScreen() {
    val nav = LocalNav.current
    val favorites by Library.favorites.collectAsState()
    LazyVerticalGrid(
        GridCells.Fixed(2),
        state = smoothGridState(),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 16.dp, bottom = dockPadding() + 24.dp),
        horizontalArrangement = Arrangement.spacedBy(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item(span = { GridItemSpan(2) }, key = "head") {
            Column(Modifier.padding(bottom = 8.dp)) {
                PageTitle("Danh sách của tôi")
                if (favorites.isNotEmpty()) Text("${favorites.size} phim đã lưu", color = Capy.TextDim, fontSize = 14.sp, modifier = Modifier.padding(top = 4.dp))
            }
        }
        if (favorites.isEmpty()) item(span = { GridItemSpan(2) }, key = "empty") {
            EmptyShelf("Danh sách còn trống.", "Nhấn trái tim trên poster để để dành phim xem sau.")
        } else items(favorites, key = { it.slug }) { fav -> PosterTile(fav) { nav.openTitle(fav) } }
    }
}

private const val DAY = 24 * 60 * 60 * 1000L

/** "Hôm nay" / "Hôm qua" / "Tuần này" / "Trước đó", by local calendar day */
private fun dayGroup(at: Long): String {
    val start = Calendar.getInstance().apply { set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0) }.timeInMillis
    return when {
        at >= start -> "Hôm nay"
        at >= start - DAY -> "Hôm qua"
        at >= start - 6 * DAY -> "Tuần này"
        else -> "Trước đó"
    }
}

/** HistoryPage.tsx: grouped by day, each with where it was left off */
@Composable
fun HistoryScreen() {
    val history by Library.history.collectAsState()
    var confirmClear by remember { mutableStateOf(false) }
    // "Xoá hết" asks once more in place instead of a dialog
    LaunchedEffect(confirmClear) { if (confirmClear) { delay(3000); confirmClear = false } }
    val groups = remember(history) { history.groupBy { dayGroup(it.updatedAt) }.toList() }

    LazyColumn(
        state = smoothListState(),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 16.dp, bottom = dockPadding() + 24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item("head") {
            Row(Modifier.fillMaxWidth().padding(bottom = 12.dp), verticalAlignment = Alignment.Bottom) {
                Column(Modifier.weight(1f)) {
                    PageTitle("Đang xem")
                    if (history.isNotEmpty()) Text("${history.size} phim, mới nhất ở trên", color = Capy.TextDim, fontSize = 14.sp, modifier = Modifier.padding(top = 4.dp))
                }
                if (history.isNotEmpty()) Box(
                    Modifier.height(36.dp).pressable { if (confirmClear) { Library.clearHistory(); confirmClear = false } else confirmClear = true }
                        .then(if (confirmClear) Modifier.clip(Capsule()).background(Capy.Red) else Modifier.glassPill())
                        .padding(horizontal = 16.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(if (confirmClear) "Bấm lần nữa để xoá" else "Xoá hết", color = if (confirmClear) Color.White else Capy.Gray300, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                }
            }
        }
        if (history.isEmpty()) item("empty") { EmptyShelf("Chưa xem phim nào.", "Tập bạn xem sẽ nằm ở đây, kèm chỗ đang dừng.") }
        groups.forEach { (label, entries) ->
            item("g:$label") { Text(label, color = Capy.TextDim, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 12.dp)) }
            items(entries, key = { it.slug }) { HistoryRow(it) }
        }
    }
}

@Composable
private fun HistoryRow(item: HistoryEntry) {
    val nav = LocalNav.current
    val watched = remember(item) {
        Library.progress(item.slug, item.episodeId)?.takeIf { it.second > 0 }?.let { (t, d) -> (t / d).toFloat().coerceIn(0f, 1f) to (d - t).coerceAtLeast(0.0) }
    }
    val open = { nav.watch(item.slug, item.episodeId) }
    Box {
        Row(
            Modifier.fillMaxWidth().cached().glassCard().padding(start = 12.dp, top = 12.dp, bottom = 12.dp, end = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            SmallPoster(item.poster, AnimeItem(item.slug, item.title, item.poster), watched?.first, Modifier.pressable(onClick = open))
            Column(Modifier.padding(start = 16.dp).weight(1f).pressable(pressedScale = 1f, onClick = open)) {
                Text(item.title, color = Color.White, fontSize = 16.sp, lineHeight = 22.sp, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                val left = watched?.second?.takeIf { it > 60 }?.let { " · còn ${Math.round(it / 60)} phút" }.orEmpty()
                Text(item.episodeName + left, color = Capy.TextDim, fontSize = 14.sp, lineHeight = 20.sp, modifier = Modifier.padding(top = 4.dp))
                Text(timeAgo(item.updatedAt), color = Capy.TextFaint, fontSize = 12.sp, lineHeight = 16.sp, modifier = Modifier.padding(top = 2.dp))
            }
            Box(Modifier.size(44.dp).pressable(pressedScale = 0.9f, onClick = open).clip(Capsule()).background(Color.White), contentAlignment = Alignment.Center) {
                FIcon(LuFilled.Play, Modifier.offset(x = 1.dp), size = 20.dp, tint = Color.Black, label = "Xem tiếp ${item.title}")
            }
        }
        Box(
            Modifier.align(Alignment.TopEnd).offset(x = 6.dp, y = (-6).dp).size(28.dp).pressable(pressedScale = 0.9f) { Library.removeHistory(item.slug) }.glassPill(),
            contentAlignment = Alignment.Center,
        ) { LIcon(Lu.X, size = 14.dp, tint = Capy.Gray300, label = "Xoá ${item.title} khỏi lịch sử") }
    }
}
