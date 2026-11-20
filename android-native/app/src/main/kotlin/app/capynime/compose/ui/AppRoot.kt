package app.capynime.compose.ui

import androidx.compose.foundation.LocalOverscrollFactory
import android.net.Uri
import androidx.activity.compose.BackHandler
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import app.capynime.compose.update.UpdateDialog
import app.capynime.compose.update.rememberGithubUpdater
import app.capynime.compose.R
import app.capynime.compose.data.AnimeItem
import app.capynime.compose.data.AnimeRepository
import app.capynime.compose.data.Library
import app.capynime.compose.ui.common.LazyImage
import app.capynime.compose.ui.common.Load
import app.capynime.compose.ui.common.Skeleton
import app.capynime.compose.ui.common.rememberLoad
import app.capynime.compose.ui.glass.LocalScreenBackdrop
import app.capynime.compose.ui.glass.glassButton
import app.capynime.compose.ui.glass.glassSupported
import app.capynime.compose.ui.glass.goldLens
import app.capynime.compose.ui.glass.liquidGlass
import app.capynime.compose.ui.glass.pressable
import app.capynime.compose.ui.glass.rounded
import app.capynime.compose.ui.screens.AccountScreen
import app.capynime.compose.ui.screens.ExploreScreen
import app.capynime.compose.ui.screens.FavoritesScreen
import app.capynime.compose.ui.screens.HistoryScreen
import app.capynime.compose.ui.screens.HomeScreen
import app.capynime.compose.ui.screens.LoginDialog
import app.capynime.compose.ui.screens.ScheduleScreen
import app.capynime.compose.ui.screens.SearchScreen
import app.capynime.compose.ui.screens.TitleSheet
import app.capynime.compose.ui.screens.WatchScreen
import app.capynime.compose.ui.theme.Capy
import com.kyant.backdrop.backdrops.layerBackdrop
import com.kyant.backdrop.backdrops.rememberLayerBackdrop
import app.capynime.compose.ui.glass.Capsule
import kotlinx.coroutines.delay

/** What sits over the pages: the title sheet, the search popup, the sign-in dialog, the hidden chrome of fullscreen */
@Stable
class Chrome {
    var sheet by mutableStateOf<AnimeItem?>(null)
    var search by mutableStateOf(false)
    var login by mutableStateOf(false)
    /** Fullscreen video: no header, no dock */
    var immersive by mutableStateOf(false)
}

/** What any screen can ask of the app: open a title's sheet, play, open a list, the account */
class Nav(private val controller: NavHostController, val chrome: Chrome) {
    val openTitle: (AnimeItem) -> Unit = { chrome.sheet = it }
    fun watch(slug: String, episodeId: String? = null) {
        chrome.sheet = null
        controller.navigate("watch?slug=${Uri.encode(slug)}&ep=${Uri.encode(episodeId ?: "")}")
    }
    /** The explore page on one source list ("Xem tất cả") */
    fun explore(path: String = "") = controller.navigate("explore?path=${Uri.encode(path)}") { launchSingleTop = true }
    fun search(query: String) = controller.navigate("search?q=${Uri.encode(query)}") { launchSingleTop = true }
    fun account(tab: String = "") = controller.navigate("account?tab=$tab") { launchSingleTop = true }
    fun login() { chrome.login = true }
    fun back() = controller.popBackStack()

    /** A dock tab: each keeps its own scroll and state while another is shown */
    fun tab(route: String) = controller.navigate(route) {
        popUpTo(controller.graph.findStartDestination().id) { saveState = true }
        launchSingleTop = true
        restoreState = true
    }
}

val LocalNav = staticCompositionLocalOf<Nav> { error("no Nav") }

private data class Tab(val route: String, val label: String, val icon: Int)

private val TABS = listOf(
    Tab("home", "Trang chủ", Lu.House),
    Tab("explore", "Khám phá", Lu.Compass),
    Tab("schedule", "Lịch chiếu", Lu.CalendarDays),
    Tab("search", "Tìm kiếm", Lu.Search),
    Tab("favorites", "Danh sách", Lu.Bookmark),
    Tab("history", "Lịch sử", Lu.History),
)

/** Room the pages leave under their content for the floating dock (AppShell pb-24) */
@Composable
fun dockPadding() = 96.dp + WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding()

@Composable
fun AppRoot() {
    val updater = rememberGithubUpdater()
    val controller = rememberNavController()
    val chrome = remember { Chrome() }
    val nav = remember(controller) { Nav(controller, chrome) }
    val screen = rememberLayerBackdrop()
    val entry by controller.currentBackStackEntryAsState()
    val route = entry?.destination?.route.orEmpty().substringBefore('?')

    // no stretch at the ends of a list: it redraws the whole list into a full-screen layer while it pulls
    CompositionLocalProvider(LocalNav provides nav, LocalScreenBackdrop provides screen.takeIf { glassSupported }, LocalOverscrollFactory provides null) {
        // the window background is the page colour (themes.xml): no full-screen fill drawn again here
        Box(Modifier.fillMaxSize()) {
            Column(Modifier.fillMaxSize()) {
                if (!chrome.immersive) Header(onCheckUpdates = { updater.check(manual = true) })
                Box(Modifier.weight(1f).fillMaxWidth().then(if (glassSupported) Modifier.layerBackdrop(screen) else Modifier)) {
                    NavHost(
                        controller,
                        startDestination = "home",
                        enterTransition = { fadeIn(tween(200)) + scaleIn(tween(260), initialScale = 0.985f) },
                        exitTransition = { fadeOut(tween(140)) },
                        popEnterTransition = { fadeIn(tween(200)) },
                        popExitTransition = { fadeOut(tween(160)) },
                    ) {
                        composable("home") { HomeScreen() }
                        composable("explore?path={path}", arguments = listOf(navArgument("path") { type = NavType.StringType; defaultValue = "" })) {
                            ExploreScreen(it.arguments?.getString("path").orEmpty())
                        }
                        composable("schedule") { ScheduleScreen() }
                        composable("search?q={q}", arguments = listOf(navArgument("q") { type = NavType.StringType; defaultValue = "" })) {
                            SearchScreen(it.arguments?.getString("q").orEmpty())
                        }
                        composable("favorites") { FavoritesScreen() }
                        composable("history") { HistoryScreen() }
                        composable(
                            "watch?slug={slug}&ep={ep}",
                            arguments = listOf(navArgument("slug") { type = NavType.StringType }, navArgument("ep") { type = NavType.StringType; defaultValue = "" }),
                            enterTransition = { slideInHorizontally(tween(320)) { it / 4 } + fadeIn(tween(220)) },
                            popExitTransition = { slideOutHorizontally(tween(260)) { it / 4 } + fadeOut(tween(200)) },
                        ) { e ->
                            WatchScreen(e.arguments?.getString("slug").orEmpty(), e.arguments?.getString("ep").orEmpty().ifEmpty { null })
                        }
                        composable("account?tab={tab}", arguments = listOf(navArgument("tab") { type = NavType.StringType; defaultValue = "" })) {
                            AccountScreen(it.arguments?.getString("tab").orEmpty())
                        }
                    }
                }
            }
            if (!chrome.immersive && !chrome.search)
                Dock(TABS.indexOfFirst { it.route == route }) { nav.tab(TABS[it].route) }
            chrome.sheet?.let { item -> TitleSheet(item, onDismiss = { chrome.sheet = null }) }
            if (chrome.search) SearchPopup(onClose = { chrome.search = false })
            if (chrome.login) LoginDialog(onClose = { chrome.login = false })
            UpdateDialog(updater)
        }
    }
}

/** HeaderBar + Brand + MobileHeader: the name, a search icon and the account button on the page colour */
@Composable
private fun Header(onCheckUpdates: () -> Unit) {
    val nav = LocalNav.current
    val user by Library.user.collectAsState()
    Row(
        Modifier.fillMaxWidth().background(Capy.Page)
            .drawBehind { drawLine(Color.White.copy(alpha = 0.1f), Offset(0f, size.height - 0.5f), Offset(size.width, size.height - 0.5f), 1.dp.toPx()) }
            .statusBarsPadding().height(64.dp).padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(Modifier.pressable(pressedScale = 1f) { nav.tab("home") }, verticalAlignment = Alignment.CenterVertically) {
            Image(
                painterResource(R.drawable.app_icon), null,
                Modifier.size(32.dp).dropRedGlow().clip(rounded(8.dp)),
            )
            Text(
                buildAnnotatedString {
                    withStyle(SpanStyle(color = Color.White)) { append("Capy") }
                    withStyle(SpanStyle(color = Capy.Red)) { append("nime") }
                },
                fontSize = 20.sp, lineHeight = 28.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = (-0.5).sp,
                modifier = Modifier.padding(start = 8.dp),
            )
        }
        Box(Modifier.weight(1f))
        Row(horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(36.dp).clip(Capsule()).clickable(onClick = onCheckUpdates), contentAlignment = Alignment.Center) {
                LIcon(Lu.Download, size = 20.dp, tint = Capy.Gray300, label = "C?p nh?t ?ng d?ng")
            }
            Box(Modifier.size(36.dp).clip(Capsule()).clickable { nav.chrome.search = true }, contentAlignment = Alignment.Center) {
                LIcon(Lu.Search, size = 20.dp, tint = Capy.Gray300, label = "Tìm kiếm")
            }
            val u = user
            if (u == null) Box(Modifier.size(36.dp).clip(Capsule()).clickable { nav.login() }, contentAlignment = Alignment.Center) {
                LIcon(Lu.User, size = 20.dp, tint = Capy.Gray300, label = "Đăng nhập")
            } else LazyImage(
                u.avatar,
                Modifier.size(36.dp).clip(Capsule()).border(2.dp, Color.White.copy(alpha = 0.2f), Capsule()).background(Color.White.copy(alpha = 0.1f))
                    .clickable { nav.account() },
            )
        }
    }
}

/** shadow-lg shadow-red-900/40 under the app icon */
private fun Modifier.dropRedGlow() = this.then(
    Modifier.drawBehind {
        drawCircle(Color(0x667F1D1D), radius = size.minDimension * 0.62f, center = center + Offset(0f, 3.dp.toPx()))
    },
)

/** SidebarDock: a floating liquid-glass pill of icons; the lit lens springs from the old tab to the new one */
@Composable
private fun Dock(selected: Int, onSelect: (Int) -> Unit) {
    Box(Modifier.fillMaxSize().navigationBarsPadding().padding(bottom = 12.dp), contentAlignment = Alignment.BottomCenter) {
        BoxWithConstraints(
            Modifier.padding(horizontal = 20.dp).widthIn(max = 384.dp).fillMaxWidth().liquidGlass().padding(6.dp),
        ) {
            val gap = 4.dp
            val cell = (maxWidth - gap * (TABS.size - 1)) / TABS.size
            if (selected >= 0) {
                val x by animateDpAsState((cell + gap) * selected, spring(dampingRatio = 0.83f, stiffness = 420f), label = "lens")
                Box(Modifier.offset(x = x).width(cell).height(44.dp).goldLens())
            }
            Row(horizontalArrangement = Arrangement.spacedBy(gap)) {
                TABS.forEachIndexed { i, t ->
                    val active = i == selected
                    Box(
                        Modifier.weight(1f).height(44.dp).clip(Capsule())
                            .clickable(remember { MutableInteractionSource() }, indication = null) { if (!active) onSelect(i) },
                        contentAlignment = Alignment.Center,
                    ) {
                        LIcon(t.icon, size = 22.dp, tint = if (active) Color(0xFF1C1300) else Color.White.copy(alpha = 0.85f), label = t.label)
                    }
                }
            }
        }
    }
}

/**
 * MobileHeader's spotlight search: a field near the top over a dimmed page (a dense tint, no blur), live results
 * under it; tapping the dimmed part closes it.
 */
@Composable
private fun SearchPopup(onClose: () -> Unit) {
    val nav = LocalNav.current
    var query by remember { mutableStateOf("") }
    val trimmed = query.trim()
    var debounced by remember { mutableStateOf("") }
    LaunchedEffect(trimmed) { delay(350); debounced = trimmed }
    val focus = remember { FocusRequester() }
    LaunchedEffect(Unit) { focus.requestFocus() }
    BackHandler(onBack = onClose)
    val fieldShape = rounded(10.dp)

    Box(
        Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.8f))
            .clickable(remember { MutableInteractionSource() }, indication = null, onClick = onClose)
            .statusBarsPadding().imePadding(),
    ) {
        BoxWithConstraints(Modifier.fillMaxSize()) {
            Column(Modifier.padding(start = 16.dp, end = 16.dp, top = maxHeight * 0.06f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        Modifier.weight(1f).height(52.dp).clip(fieldShape)
                            .background(androidx.compose.ui.graphics.Brush.linearGradient(listOf(Color.White.copy(alpha = 0.16f), Color.White.copy(alpha = 0.05f))))
                            .border(1.dp, Color.White.copy(alpha = 0.2f), fieldShape)
                            .clickable(remember { MutableInteractionSource() }, indication = null) {},
                        contentAlignment = Alignment.CenterStart,
                    ) {
                        LIcon(Lu.Search, Modifier.padding(start = 12.dp), size = 14.dp, tint = Capy.TextDim)
                        BasicTextField(
                            query, { query = it },
                            Modifier.fillMaxWidth().padding(start = 44.dp, end = 12.dp).focusRequester(focus),
                            singleLine = true,
                            textStyle = TextStyle(color = Color.White, fontSize = 16.sp, fontFamily = app.capynime.compose.ui.theme.BeVietnam),
                            cursorBrush = SolidColor(Color.White),
                            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                            keyboardActions = KeyboardActions(onSearch = { if (trimmed.isNotEmpty()) { onClose(); nav.search(trimmed) } }),
                            decorationBox = { inner ->
                                if (query.isEmpty()) Text("Tìm kiếm anime...", color = Capy.TextDim, fontSize = 16.sp)
                                inner()
                            },
                        )
                    }
                    Box(
                        Modifier.padding(start = 8.dp).size(48.dp).pressable(pressedScale = 0.9f, onClick = onClose).glassButton(rounded(8.dp)),
                        contentAlignment = Alignment.Center,
                    ) { LIcon(Lu.X, size = 20.dp, tint = Capy.Gray300, label = "Đóng tìm kiếm") }
                }
                if (trimmed.isNotEmpty()) SearchResults(trimmed, debounced, onClose)
            }
        }
    }
}

@Composable
private fun SearchResults(trimmed: String, debounced: String, onClose: () -> Unit) {
    val nav = LocalNav.current
    val shape = rounded(12.dp)
    Column(
        Modifier.padding(top = 8.dp).fillMaxWidth().clip(shape)
            .background(androidx.compose.ui.graphics.Brush.linearGradient(listOf(Color(40, 40, 52).copy(alpha = 0.97f), Color(14, 14, 20).copy(alpha = 0.98f))))
            .border(1.dp, Color.White.copy(alpha = 0.14f), shape)
            .clickable(remember { MutableInteractionSource() }, indication = null) {},
    ) {
        if (debounced.isEmpty()) return@Column
        val results = rememberLoad("search:$debounced:1") { AnimeRepository.search(debounced, 1) }
        when (val s = results.value) {
            is Load.Ok -> if (s.value.items.isEmpty()) Text(
                "Không tìm thấy anime nào cho “$trimmed”.", color = Capy.TextDim, fontSize = 14.sp,
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 24.dp),
            ) else {
                LazyColumn(Modifier.weight(1f, fill = false), contentPadding = PaddingValues(8.dp)) {
                    items(s.value.items.take(8), key = { it.slug }) { item ->
                        Row(
                            Modifier.fillMaxWidth().clip(rounded(8.dp)).clickable { onClose(); nav.watch(item.slug) }.padding(10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            LazyImage(item.poster, Modifier.width(64.dp).height(96.dp).clip(rounded(8.dp)).background(Color.White.copy(alpha = 0.1f)), art = item)
                            Column(Modifier.padding(start = 16.dp)) {
                                Text(item.title, color = Color.White, fontSize = 16.sp, lineHeight = 22.sp, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                                if (item.episode.isNotBlank()) Text(item.episode, color = Capy.TextDim, fontSize = 14.sp, maxLines = 1, modifier = Modifier.padding(top = 4.dp))
                            }
                        }
                    }
                }
                Text(
                    "Xem tất cả ${s.value.items.size} kết quả", color = Capy.Gray200, fontSize = 14.sp, fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.fillMaxWidth().drawBehind { drawLine(Color.White.copy(alpha = 0.1f), Offset.Zero, Offset(size.width, 0f), 1f) }
                        .clickable { onClose(); nav.search(trimmed) }.padding(horizontal = 16.dp, vertical = 10.dp),
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                )
            }
            else -> Column(Modifier.padding(6.dp)) {
                repeat(3) {
                    Row(Modifier.padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Skeleton(Modifier.width(40.dp).height(56.dp), 4.dp)
                        Column(Modifier.padding(start = 12.dp).weight(1f)) {
                            Skeleton(Modifier.fillMaxWidth(0.75f).height(14.dp))
                            Skeleton(Modifier.padding(top = 8.dp).fillMaxWidth(0.33f).height(12.dp))
                        }
                    }
                }
            }
        }
    }
}

