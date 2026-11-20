package app.capynime.compose.ui.screens

import app.capynime.compose.ui.common.smoothGridState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.grid.rememberLazyGridState
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.capynime.compose.data.AnimeItem
import app.capynime.compose.data.AnimeRepository
import app.capynime.compose.data.Library
import app.capynime.compose.data.Page
import app.capynime.compose.ui.FIcon
import app.capynime.compose.ui.LIcon
import app.capynime.compose.ui.LocalNav
import app.capynime.compose.ui.Lu
import app.capynime.compose.ui.LuFilled
import app.capynime.compose.ui.common.LazyImage
import app.capynime.compose.ui.common.Load
import app.capynime.compose.ui.common.MemoryCache
import app.capynime.compose.ui.common.PageTitle
import app.capynime.compose.ui.common.PosterGridSkeleton
import app.capynime.compose.ui.common.PosterTile
import app.capynime.compose.ui.common.fmtRating
import app.capynime.compose.ui.common.friendly
import app.capynime.compose.ui.common.rememberLoad
import app.capynime.compose.ui.dockPadding
import app.capynime.compose.ui.glass.cardLift
import app.capynime.compose.ui.glass.glassCard
import app.capynime.compose.ui.glass.glassField
import app.capynime.compose.ui.glass.glassPill
import app.capynime.compose.ui.glass.glassRim
import app.capynime.compose.ui.glass.cached
import app.capynime.compose.ui.glass.pressable
import app.capynime.compose.ui.glass.rounded
import app.capynime.compose.ui.theme.BeVietnam
import app.capynime.compose.ui.theme.Capy
import app.capynime.compose.ui.glass.Capsule
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.launch

/** Pages of one source list, joined without repeats (useBrowseInfiniteQuery) */
private class Pager(val key: String, val loader: suspend (Int) -> Page) {
    val items = mutableStateListOf<AnimeItem>()
    var page by mutableIntStateOf(0)
    var total by mutableIntStateOf(1)
    var loading by mutableStateOf(false)
    var error by mutableStateOf<String?>(null)
    val hasNext get() = page < total

    suspend fun next() {
        if (loading || (page > 0 && !hasNext)) return
        loading = true
        error = null
        try {
            val n = page + 1
            val result = MemoryCache.get<Page>("$key:$n")?.first ?: withContext(Dispatchers.Default) { loader(n) }.also { MemoryCache.put("$key:$n", it) }
            val seen = items.mapTo(HashSet()) { it.slug.ifEmpty { it.title } }
            items.addAll(result.items.filter { seen.add(it.slug.ifEmpty { it.title }) })
            page = n
            total = maxOf(result.totalPages, n)
        } catch (e: kotlinx.coroutines.CancellationException) {
            throw e
        } catch (e: Throwable) {
            error = friendly(e)
        } finally {
            loading = false
        }
    }
}

/** h-9 rounded-full px-4 text-sm font-semibold: solid white when picked, glass otherwise */
@Composable
fun FilterPill(text: String, selected: Boolean, onClick: () -> Unit) {
    Box(
        Modifier.height(36.dp).pressable(onClick = onClick)
            .then(if (selected) Modifier.clip(Capsule()).background(Color.White).border(1.dp, Color.White, Capsule()) else Modifier.glassPill())
            .padding(horizontal = 16.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(text, color = if (selected) Color.Black else Capy.Gray200, fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
    }
}

/** ExplorePage.tsx: the trending titles, or one source list page after page, as a 2-column grid */
@Composable
fun ExploreScreen(path: String) {
    val nav = LocalNav.current
    val menus = rememberLoad("menu", staleMs = 60 * 60_000) { AnimeRepository.menu() }
    val groups = (menus.value as? Load.Ok)?.value.orEmpty()
    val home = rememberLoad("home") { AnimeRepository.home() }
    val pager = remember(path) { Pager("browse:$path") { AnimeRepository.browse(path, it) } }
    val grid = smoothGridState()
    val scope = rememberCoroutineScope()

    val items: List<AnimeItem> = if (path.isEmpty()) (home.value as? Load.Ok)?.value?.let { it.nominate.ifEmpty { it.latest } }.orEmpty() else pager.items
    val loading = if (path.isEmpty()) home.value is Load.Loading else pager.page == 0 && pager.error == null

    if (path.isNotEmpty()) {
        LaunchedEffect(pager) { pager.next() }
        // next page: loads by itself as the end nears the screen (rootMargin 1200px)
        val nearEnd by remember { derivedStateOf { (grid.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0) >= grid.layoutInfo.totalItemsCount - 8 } }
        LaunchedEffect(pager) { snapshotFlow { nearEnd }.distinctUntilChanged().filter { it }.collect { if (pager.hasNext) pager.next() } }
    }

    val group = groups.firstOrNull { g -> g.items.any { it.path == path } }
    val entry = group?.items?.firstOrNull { it.path == path }
    val title = when {
        path.isEmpty() -> "Thịnh Hành"
        entry != null -> if (group != groups.firstOrNull()) "${group.label}: ${entry.label}" else entry.label
        else -> TYPE_LABELS[path] ?: "Danh sách anime"
    }

    LazyVerticalGrid(
        GridCells.Fixed(2),
        state = grid,
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 16.dp, bottom = dockPadding() + 24.dp),
        horizontalArrangement = Arrangement.spacedBy(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item(span = { GridItemSpan(2) }, key = "title") { PageTitle(title, Modifier.padding(bottom = 4.dp)) }
        item(span = { GridItemSpan(2) }, key = "pills") {
            LazyRow(
                contentPadding = PaddingValues(top = 4.dp, bottom = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                item { FilterPill("Thịnh Hành", path.isEmpty()) { nav.explore("") } }
                items(groups.firstOrNull()?.items.orEmpty(), key = { it.path }) { link -> FilterPill(link.label, link.path == path) { nav.explore(link.path) } }
            }
        }
        when {
            loading -> item(span = { GridItemSpan(2) }, key = "skeleton") { PosterGridSkeleton(18) }
            items.isEmpty() -> item(span = { GridItemSpan(2) }, key = "empty") {
                Column(Modifier.fillMaxWidth().glassCard(rounded(12.dp)).padding(horizontal = 24.dp, vertical = 48.dp)) {
                    Text(if (pager.error != null) "Không tải được danh sách này." else "Chưa có phim nào trong mục này.", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                    Text("Thử chọn mục khác ở trên hoặc trong menu.", color = Capy.TextDim, fontSize = 14.sp, modifier = Modifier.padding(top = 4.dp))
                }
            }
            else -> items(items, key = { it.slug.ifEmpty { it.title } }) { anime -> PosterTile(anime) { nav.openTitle(anime) } }
        }
        if (path.isNotEmpty() && pager.page > 0 && pager.hasNext) item(span = { GridItemSpan(2) }, key = "more") {
            Box(Modifier.fillMaxWidth().padding(vertical = 24.dp), contentAlignment = Alignment.Center) {
                if (pager.loading) CircularProgressIndicator(Modifier.size(28.dp), color = Color.White, strokeWidth = 2.dp, trackColor = Color.White.copy(alpha = 0.2f))
                else FilterPill("Tải thêm", false) { scope.launch { pager.next() } }
            }
        }
    }
}

/** Older "?type=" links: the source list each always meant (ExplorePage TYPE_PATHS) */
private val TYPE_LABELS = mapOf(
    "/anime-bo/" to "TV/Series",
    "/anime-le/" to "Movie/OVA",
    "/hoat-hinh-trung-quoc/" to "HH Trung Quốc",
    "/anime-sap-chieu/" to "Anime Sắp Chiếu",
    "/danh-sach/list-dang-chieu/" to "Anime Đang Chiếu",
    "/danh-sach/list-tron-bo/" to "Anime Trọn Bộ",
    "/bang-xep-hang/day.html" to "Top Anime Theo Ngày",
    "/bang-xep-hang/month.html" to "Top Anime Theo Tháng",
    "/bang-xep-hang/season.html" to "Top Anime Theo Mùa",
    "/bang-xep-hang/year.html" to "Top Anime Theo Năm",
)

private val SUGGESTIONS = listOf("One Piece", "Chú Thuật Hồi Chiến", "Thám Tử Conan", "Solo Leveling", "Bleach", "Naruto")

/** SearchPage.tsx: the big field, suggestions, then the results as MovieCards */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun SearchScreen(initial: String) {
    val nav = LocalNav.current
    var term by rememberSaveable(initial) { mutableStateOf(initial) }
    var debounced by remember { mutableStateOf(initial.trim()) }
    LaunchedEffect(term) { delay(350); debounced = term.trim() }
    val results = rememberLoad("searchlist:$debounced") { if (debounced.isEmpty()) emptyList() else AnimeRepository.search(debounced, 1).items }

    LazyVerticalGrid(
        GridCells.Fixed(2),
        state = smoothGridState(),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 32.dp, bottom = dockPadding() + 32.dp),
        horizontalArrangement = Arrangement.spacedBy(20.dp),
        verticalArrangement = Arrangement.spacedBy(32.dp),
    ) {
        item(span = { GridItemSpan(2) }, key = "head") {
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    LIcon(Lu.Search, size = 14.dp, tint = Capy.Red)
                    Text("TÌM KIẾM TRỰC TUYẾN", color = Capy.Red, fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 0.7.sp, modifier = Modifier.padding(start = 8.dp))
                }
                Text(
                    "Tìm Kiếm Anime Yêu Thích", color = Color.White, fontSize = 30.sp, lineHeight = 36.sp, fontWeight = FontWeight.ExtraBold,
                    modifier = Modifier.padding(top = 8.dp, bottom = 24.dp),
                )
                Row(
                    Modifier.fillMaxWidth().height(56.dp).glassField(Capsule()).padding(horizontal = 20.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    LIcon(Lu.Search, size = 16.dp, tint = Capy.Red)
                    BasicTextField(
                        term, { term = it }, Modifier.weight(1f).padding(start = 12.dp),
                        singleLine = true,
                        textStyle = TextStyle(color = Color.White, fontSize = 16.sp, fontFamily = BeVietnam),
                        cursorBrush = SolidColor(Color.White),
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                        decorationBox = { inner ->
                            if (term.isEmpty()) Text("Nhập tên anime (Ví dụ: One Piece, Jujutsu Kaisen, Conan...)", color = Capy.TextDim, fontSize = 16.sp, maxLines = 1, softWrap = false)
                            inner()
                        },
                    )
                    if (term.isNotEmpty()) Box(Modifier.size(28.dp).clip(Capsule()).pressable { term = ""; debounced = "" }, contentAlignment = Alignment.Center) {
                        LIcon(Lu.X, size = 16.dp, tint = Capy.Gray300, label = "Xoá")
                    }
                }
            }
        }
        item(span = { GridItemSpan(2) }, key = "suggest") {
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp), itemVerticalAlignment = Alignment.CenterVertically) {
                Text("Gợi ý tìm kiếm:", color = Capy.TextDim, fontSize = 12.sp, lineHeight = 16.sp)
                SUGGESTIONS.forEach { kw ->
                    Box(Modifier.height(28.dp).pressable { term = kw }.glassPill().padding(horizontal = 12.dp), contentAlignment = Alignment.Center) {
                        Text(kw, color = Capy.Gray200, fontSize = 12.sp, lineHeight = 16.sp)
                    }
                }
            }
        }
        if (debounced.isNotEmpty()) {
            when (val s = results.value) {
                is Load.Loading -> item(span = { GridItemSpan(2) }, key = "loading") { PosterGridSkeleton(6) }
                is Load.Failed -> item(span = { GridItemSpan(2) }, key = "failed") { NoResults(debounced) }
                is Load.Ok -> if (s.value.isEmpty()) item(span = { GridItemSpan(2) }, key = "none") { NoResults(debounced) } else {
                    item(span = { GridItemSpan(2) }, key = "count") {
                        Text("Kết quả tìm kiếm cho “$debounced” (${s.value.size} anime)", color = Color.White, fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.Bold)
                    }
                    items(s.value, key = { it.slug.ifEmpty { it.title } }) { anime -> MovieCard(anime) { nav.openTitle(anime) } }
                }
            }
        }
    }
}

@Composable
private fun NoResults(query: String) {
    Column(
        Modifier.fillMaxWidth().clip(rounded(12.dp)).background(Capy.Surface).border(1.dp, Color.White.copy(alpha = 0.1f), rounded(12.dp)).padding(48.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        LIcon(Lu.Alert, size = 40.dp, tint = Capy.TextDim)
        Text("Không tìm thấy kết quả nào cho “$query”", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 12.dp))
        Text(
            "Vui lòng kiểm tra lại chính tả hoặc thử tìm kiếm bằng từ khóa tiếng Việt / tiếng Anh khác.",
            color = Capy.TextDim, fontSize = 12.sp, lineHeight = 16.sp, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 12.dp),
        )
    }
}

/** MovieCard.tsx (search results): poster with corner chip and heart, then a dark footer with title and facts */
@Composable
fun MovieCard(anime: AnimeItem, onClick: () -> Unit) {
    val favorites by Library.favorites.collectAsState()
    val isFavorite = favorites.any { it.slug == anime.slug }
    val shape = rounded(8.dp)
    Column(Modifier.pressable(onClick = onClick).cached().cardLift(shape).clip(shape).background(Capy.Surface.copy(alpha = 0.9f))) {
        Box(Modifier.fillMaxWidth().aspectRatio(2f / 3f).background(Color.Black.copy(alpha = 0.4f))) {
            LazyImage(anime.poster, Modifier.fillMaxSize(), art = anime)
            Box(Modifier.fillMaxSize().glassRim(androidx.compose.foundation.shape.RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp)))
            Row(Modifier.fillMaxWidth().padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                val (chip, bg, border, fg) = when {
                    anime.isUpcoming -> listOf("SẮP CHIẾU", Capy.Red, Color(0xFFF87171), Color.White)
                    anime.rank != null -> listOf("TOP #${anime.rank}", Capy.Amber500, Capy.Amber, Color.Black)
                    else -> listOf(anime.episode.ifBlank { anime.quality }.ifBlank { "HD Vietsub" }, Color.Black.copy(alpha = 0.8f), Color.White.copy(alpha = 0.1f), Color.White)
                }
                Box(
                    Modifier.height(24.dp).clip(rounded(4.dp)).background(bg as Color).border(1.dp, border as Color, rounded(4.dp)).padding(horizontal = 8.dp),
                    contentAlignment = Alignment.Center,
                ) { Text(chip as String, color = fg as Color, fontSize = 10.sp, lineHeight = 14.sp, fontWeight = FontWeight.Bold, maxLines = 1) }
                Box(Modifier.weight(1f))
                Box(
                    Modifier.size(28.dp).clip(Capsule())
                        .then(if (isFavorite) Modifier.background(Capy.Red) else Modifier.background(Color.Black.copy(alpha = 0.8f)).border(1.dp, Color.White.copy(alpha = 0.1f), Capsule()))
                        .pressable(pressedScale = 0.9f) { Library.toggleFavorite(anime) },
                    contentAlignment = Alignment.Center,
                ) {
                    if (isFavorite) FIcon(LuFilled.Heart, size = 14.dp, tint = Color.White, label = "Bỏ yêu thích")
                    else LIcon(Lu.Heart, size = 14.dp, tint = Capy.Gray300, label = "Yêu thích")
                }
            }
        }
        Column(Modifier.fillMaxWidth().background(Color(0xFF0B0D14)).padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(anime.title, color = Color.White, fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text(anime.year?.toString() ?: "Anime", color = Capy.TextDim, fontSize = 11.sp, lineHeight = 16.sp, modifier = Modifier.weight(1f))
                FIcon(LuFilled.Star, size = 12.dp, tint = Capy.Amber400)
                Text(fmtRating(anime.rating) ?: "9.5", color = Capy.Amber400, fontSize = 11.sp, lineHeight = 16.sp, fontWeight = FontWeight.Medium, modifier = Modifier.padding(start = 4.dp))
            }
        }
    }
}
