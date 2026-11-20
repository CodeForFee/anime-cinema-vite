package app.capynime.compose.player

import android.content.res.Configuration
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.dropShadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import app.capynime.compose.ui.FIcon
import app.capynime.compose.ui.LIcon
import app.capynime.compose.ui.Lu
import app.capynime.compose.ui.LuFilled
import app.capynime.compose.ui.glass.glassButton
import app.capynime.compose.ui.glass.glassSheet
import app.capynime.compose.ui.glass.pressable
import app.capynime.compose.ui.glass.rounded
import app.capynime.compose.ui.theme.Capy
import app.capynime.compose.ui.glass.Capsule
import kotlinx.coroutines.delay
import androidx.compose.ui.graphics.shadow.Shadow as DropShadow

private enum class Panel { None, Cinema, Speed, Quality, Episodes }

fun formatTime(seconds: Double): String {
    val s = seconds.toLong().coerceAtLeast(0)
    val h = s / 3600
    val m = (s % 3600) / 60
    val r = s % 60
    return if (h > 0) "%d:%02d:%02d".format(h, m, r) else "%d:%02d".format(m, r)
}

/**
 * The player frame and the app's controls over it (TouchControls.tsx + control-parts.tsx): tap to show / hide,
 * double tap a side to skip 10 s, the centre buttons, the seek bar, the chips row and its sheets. Without the
 * bridge (plain file, old frame) the page's own controls stay in charge.
 */
@Composable
fun PlayerSurface(
    controller: PlayerController,
    title: String,
    episodeLabel: String,
    fullscreen: Boolean,
    hasNext: Boolean,
    onNext: () -> Unit,
    onToggleFullscreen: () -> Unit,
    modifier: Modifier = Modifier,
    episodes: (@Composable (close: () -> Unit) -> Unit)? = null,
) {
    val state = if (controller.ready) controller.state else null
    var visible by remember { mutableStateOf(true) }
    var touched by remember { mutableLongStateOf(0L) }
    var panel by remember { mutableStateOf(Panel.None) }
    var locked by remember { mutableStateOf(false) }
    var scrubbing by remember { mutableStateOf(false) }
    var jump by remember { mutableStateOf<Pair<Int, Int>?>(null) } // direction, key
    val touch = { touched = System.currentTimeMillis() }

    // useAutoHide: the controls leave 3 s after the last touch while playing
    LaunchedEffect(visible, touched, state?.paused, panel, scrubbing) {
        if (visible && state != null && !state.paused && panel == Panel.None && !scrubbing) {
            delay(3000)
            visible = false
        }
    }
    LaunchedEffect(jump) { if (jump != null) { delay(700); jump = null } }

    Box(modifier.background(Color.Black)) {
        if (controller.hasStream) key(controller.nativePlayback) {
            AndroidView(
                factory = { controller.surface.apply { (parent as? android.view.ViewGroup)?.removeView(this); if (!controller.nativePlayback) keepScreenOn = true } },
                modifier = Modifier.fillMaxSize(),
            )
        }

        controller.playbackError?.let { message ->
            Column(Modifier.fillMaxSize().background(Color.Black).padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                Text(message, color = Color.White, fontSize = 14.sp)
                Box(Modifier.padding(top = 12.dp).glassButton().clickable { controller.retry() }.padding(horizontal = 18.dp, vertical = 10.dp)) {
                    Text("Thử lại", color = Color.White, fontWeight = FontWeight.SemiBold)
                }
            }
            return@Box
        }

        if (!controller.loaded) Column(Modifier.fillMaxSize().background(Color.Black), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            CircularProgressIndicator(Modifier.size(48.dp), color = Capy.Red, strokeWidth = 4.dp, trackColor = Color.White.copy(alpha = 0.2f))
            Text("Đang tải video...", color = Capy.Gray300, fontSize = 14.sp, modifier = Modifier.padding(top = 12.dp))
        }
        if (state == null) return@Box

        // the gesture layer over the frame: the page under it only gets what the bridge sends
        Box(
            Modifier.fillMaxSize().pointerInput(state.duration, locked) {
                detectTapGestures(
                    onTap = { visible = !visible; touch() },
                    onDoubleTap = { offset ->
                        if (locked) return@detectTapGestures
                        val forward = offset.x > size.width / 2
                        val s = controller.state ?: return@detectTapGestures
                        controller.seek((s.currentTime + if (forward) 10 else -10).coerceIn(0.0, s.duration.takeIf { it > 0 } ?: Double.MAX_VALUE))
                        jump = (if (forward) 1 else -1) to ((jump?.second ?: 0) + 1)
                        touch()
                    },
                )
            },
        )

        jump?.let { (dir, _) ->
            Text(
                if (dir < 0) "− 10 giây" else "+ 10 giây", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold,
                modifier = Modifier.align(if (dir < 0) Alignment.CenterStart else Alignment.CenterEnd).padding(horizontal = 36.dp)
                    .glassButton().padding(horizontal = 16.dp, vertical = 8.dp),
            )
        }

        if (locked) {
            if (visible) Row(
                Modifier.align(Alignment.BottomCenter).padding(bottom = 24.dp).height(44.dp).pressable { locked = false; touch() }.glassButton().padding(horizontal = 20.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                LIcon(Lu.Lock, size = 16.dp)
                Text("Mở khoá màn hình", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(start = 8.dp))
            }
        } else {
            val alpha by animateFloatAsState(if (visible) 1f else 0f, tween(200), label = "controls")
            if (alpha > 0f) Column(
                Modifier.fillMaxSize().graphicsLayer { this.alpha = alpha; compositingStrategy = CompositingStrategy.ModulateAlpha }
                    .background(Brush.verticalGradient(listOf(Color.Black.copy(alpha = 0.7f), Color.Black.copy(alpha = 0.05f), Color.Black.copy(alpha = 0.8f)))),
                verticalArrangement = Arrangement.SpaceBetween,
            ) {
                // TitleBar
                Row(Modifier.fillMaxWidth().padding(start = 12.dp, end = 12.dp, top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    if (fullscreen) Box(Modifier.size(40.dp).clip(Capsule()).clickable { onToggleFullscreen() }, contentAlignment = Alignment.Center) {
                        LIcon(Lu.ChevronDown, size = 24.dp, label = "Thoát toàn màn hình")
                    }
                    Text(
                        buildAnnotatedString {
                            append(title)
                            if (episodeLabel.isNotEmpty()) withStyle(SpanStyle(color = Color.White.copy(alpha = 0.7f), fontWeight = FontWeight.Normal)) { append(" · $episodeLabel") }
                        },
                        color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f),
                    )
                }
                // CenterControls
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(40.dp, Alignment.CenterHorizontally), verticalAlignment = Alignment.CenterVertically) {
                    SeekRound(Lu.RotateCcw, "Lùi 10 giây") { controller.seek((state.currentTime - 10).coerceAtLeast(0.0)); touch() }
                    Box(
                        Modifier.size(64.dp).pressable(pressedScale = 0.9f) { if (state.paused) controller.play() else controller.pause(); touch() }.glassButton(),
                        contentAlignment = Alignment.Center,
                    ) {
                        var late by remember { mutableStateOf(false) }
                        LaunchedEffect(state.waiting) { late = false; if (state.waiting) { delay(300); late = true } }
                        when {
                            state.waiting && late -> CircularProgressIndicator(Modifier.size(36.dp), color = Color.White, strokeWidth = 3.dp, trackColor = Color.White.copy(alpha = 0.25f))
                            state.paused -> FIcon(LuFilled.Play, Modifier.offset(x = 2.dp), size = 32.dp, label = "Phát")
                            else -> PauseIcon()
                        }
                    }
                    SeekRound(Lu.RotateCw, "Tới 10 giây") { controller.seek(state.currentTime + 10); touch() }
                }
                Column(Modifier.fillMaxWidth().padding(start = 12.dp, end = 12.dp, bottom = 8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    SeekBar(state, onSeek = { controller.seek(it); touch() }, onScrubbing = { scrubbing = it; touch() })
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        Row(Modifier.weight(1f).horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                            PlayerChip(Lu.Gauge, "${state.rate.toString().removeSuffix(".0")}x") { panel = Panel.Speed; touch() }
                            if (controller.levels.isNotEmpty()) PlayerChip(Lu.Settings, controller.visualLabel.ifBlank { "Tự động" }) { panel = Panel.Quality; touch() }
                            // lit while one of the choices is on (EnhanceChip: the viewer's choices, not what the engine reports)
                            val prefs by app.capynime.compose.data.Library.player.collectAsState()
                            val active = !controller.nativePlayback && (prefs.upscale != "off" || prefs.color || prefs.surround)
                            // CapyCinema is off on the web too: the chip stays only for someone who still has an effect on, to turn it off
                            if (active) PlayerChip(Lu.Sparkles, "CapyCinema", active = true) { panel = Panel.Cinema; touch() }
                            PlayerChip(Lu.Lock, "Khoá") { locked = true; touch() }
                            if (episodes != null && fullscreen) PlayerChip(Lu.ListVideo, "Tập") { panel = Panel.Episodes; touch() }
                            if (hasNext) PlayerChip(Lu.SkipForward, "Tập tiếp") { onNext(); touch() }
                        }
                        // always on screen, whatever the chips scroll to
                        Box(Modifier.padding(start = 4.dp).size(36.dp).clip(Capsule()).clickable { onToggleFullscreen(); touch() }, contentAlignment = Alignment.Center) {
                            LIcon(if (fullscreen) Lu.Minimize else Lu.Maximize, size = 20.dp, label = if (fullscreen) "Thoát toàn màn hình" else "Toàn màn hình")
                        }
                    }
                }
            }
        }

        if (panel != Panel.None) PlayerSheet(
            title = when (panel) {
                Panel.Cinema -> "CapyCinema"
                Panel.Speed -> "Tốc độ phát"
                Panel.Quality -> "Chất lượng"
                else -> "Danh sách tập"
            },
            onClose = { panel = Panel.None },
        ) { close ->
            when (panel) {
                Panel.Cinema -> CinemaPanel(controller)
                Panel.Speed -> Options(listOf(0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0).map { (if (it == 1.0) "Bình thường" else "${it}x".replace(".0x", "x")) to it }, state.rate) { controller.rate(it); close() }
                Panel.Quality -> Options(
                    listOf("Tự động" to -1.0) + controller.levels.sortedByDescending { it.height }.map { it.label.ifBlank { "${it.height}p" } to it.index.toDouble() },
                    controller.currentLevel.toDouble(),
                ) { controller.quality(it.toInt()); close() }
                Panel.Episodes -> episodes?.invoke(close)
                Panel.None -> Unit
            }
        }
    }
}

@Composable
private fun PauseIcon() = Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
    repeat(2) { Box(Modifier.width(8.dp).height(26.dp).clip(rounded(2.dp)).background(Color.White)) }
}

/** The 10-second buttons: a turning arrow with "10" in it */
@Composable
private fun SeekRound(icon: Int, label: String, onClick: () -> Unit) {
    Box(Modifier.size(48.dp).pressable(pressedScale = 0.9f, onClick = onClick), contentAlignment = Alignment.Center) {
        LIcon(icon, size = 36.dp, label = label)
        Text("10", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold)
    }
}

/** CHIP: glass-button h-9 rounded-full px-3.5 text-xs font-semibold; lit white when [active] */
@Composable
private fun PlayerChip(icon: Int, text: String, active: Boolean = false, onClick: () -> Unit) {
    Row(
        Modifier.height(36.dp).pressable(pressedScale = 0.95f, onClick = onClick)
            .then(if (active) Modifier.clip(Capsule()).background(Color.White) else Modifier.glassButton())
            .padding(horizontal = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        val fg = if (active) Color.Black else Color.White
        LIcon(icon, size = 16.dp, tint = fg)
        Text(text, color = fg, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, modifier = Modifier.padding(start = 6.dp))
    }
}

/** SeekBar: the time, a thin red track with a red thumb in a tall touch target, the length */
@Composable
private fun SeekBar(state: PlayerState, onSeek: (Double) -> Unit, onScrubbing: (Boolean) -> Unit) {
    var scrub by remember { mutableStateOf<Double?>(null) }
    val duration = state.duration.takeIf { it > 0 } ?: 1.0
    val shown = scrub ?: state.currentTime
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(formatTime(shown), color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Medium)
        BoxWithConstraints(
            Modifier.weight(1f).padding(horizontal = 12.dp).height(28.dp)
                .pointerInput(duration) {
                    fun at(x: Float) = (x / size.width).coerceIn(0f, 1f) * duration
                    detectTapGestures { onSeek(at(it.x)) }
                }
                .pointerInput(duration) {
                    fun at(x: Float) = (x / size.width).coerceIn(0f, 1f) * duration
                    detectHorizontalDragGestures(
                        onDragStart = { scrub = at(it.x); onScrubbing(true) },
                        onDragEnd = { scrub?.let(onSeek); scrub = null; onScrubbing(false) },
                        onDragCancel = { scrub = null; onScrubbing(false) },
                    ) { change, _ -> scrub = at(change.position.x) }
                },
            contentAlignment = Alignment.CenterStart,
        ) {
            val fraction = (shown / duration).toFloat().coerceIn(0f, 1f)
            Box(Modifier.fillMaxWidth().height(4.dp).clip(Capsule()).background(Color.White.copy(alpha = 0.3f))) {
                Box(Modifier.fillMaxWidth(((state.currentTime + state.ahead) / duration).toFloat().coerceIn(0f, 1f)).fillMaxHeight().background(Color.White.copy(alpha = 0.2f)))
                Box(Modifier.fillMaxWidth(fraction).fillMaxHeight().background(Capy.Red))
            }
            Box(
                Modifier.offset(x = maxWidth * fraction - 7.dp).size(14.dp)
                    .dropShadow(Capsule(), DropShadow(radius = 0.dp, spread = 4.dp, color = Capy.Red.copy(alpha = 0.25f)))
                    .clip(Capsule()).background(Capy.Red),
            )
        }
        Text(formatTime(state.duration), color = Color.White.copy(alpha = 0.7f), fontSize = 12.sp, fontWeight = FontWeight.Medium)
    }
}

/**
 * PlayerSheets.tsx Sheet: inside the frame (so it shows in full screen too), a floating card at the bottom in
 * portrait and a side panel in landscape, over a dimmed player; Android back closes it first.
 */
@Composable
private fun PlayerSheet(title: String, onClose: () -> Unit, content: @Composable (close: () -> Unit) -> Unit) {
    var shown by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { shown = true }
    var closing by remember { mutableIntStateOf(0) }
    val close = { if (closing == 0) { closing = 1; shown = false } }
    LaunchedEffect(closing) { if (closing == 1) { delay(220); onClose() } }
    BackHandler(onBack = close)
    val landscape = LocalConfiguration.current.orientation == Configuration.ORIENTATION_LANDSCAPE
    val dim by animateFloatAsState(if (shown) 0.45f else 0f, tween(220), label = "dim")
    Box(Modifier.fillMaxSize().background(Color.Black.copy(alpha = dim)).clickable(remember { MutableInteractionSource() }, indication = null, onClick = close)) {
        AnimatedVisibility(
            shown,
            modifier = Modifier.align(if (landscape) Alignment.CenterEnd else Alignment.BottomCenter),
            enter = if (landscape) slideInHorizontally(tween(320, easing = app.capynime.compose.ui.screens.EaseIos)) { it } + fadeIn() else slideInVertically(tween(320, easing = app.capynime.compose.ui.screens.EaseIos)) { it } + fadeIn(),
            exit = if (landscape) slideOutHorizontally(tween(220)) { it } + fadeOut(tween(220)) else slideOutVertically(tween(220)) { it } + fadeOut(tween(220)),
        ) {
            BoxWithConstraints {
                Column(
                    Modifier.padding(8.dp)
                        .then(if (landscape) Modifier.width(minOf(380.dp, maxWidth * 0.46f)).fillMaxHeight() else Modifier.fillMaxWidth().heightIn(max = maxHeight - 16.dp))
                        .clip(rounded(12.dp)).glassSheet(0.dp)
                        .clickable(remember { MutableInteractionSource() }, indication = null) {},
                ) {
                    Row(Modifier.fillMaxWidth().padding(start = 16.dp, end = 8.dp, top = 12.dp, bottom = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text(title, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                        Box(Modifier.size(32.dp).clip(Capsule()).clickable(onClick = close), contentAlignment = Alignment.Center) {
                            LIcon(Lu.X, size = 16.dp, label = "Đóng")
                        }
                    }
                    Column(Modifier.verticalScroll(rememberScrollState()).padding(start = 12.dp, end = 12.dp, bottom = 12.dp)) { content(close) }
                }
            }
        }
    }
}

/** One choice per row, the current one ticked (speed, quality) */
@Composable
private fun Options(options: List<Pair<String, Double>>, current: Double, onPick: (Double) -> Unit) {
    options.forEach { (label, value) ->
        val selected = value == current
        Row(
            Modifier.fillMaxWidth().clip(rounded(8.dp)).background(if (selected) Color.White.copy(alpha = 0.1f) else Color.Transparent)
                .clickable { onPick(value) }.padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(label, color = Color.White, fontSize = 14.sp, fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal, modifier = Modifier.weight(1f))
            if (selected) LIcon(Lu.Check, size = 16.dp, tint = Capy.Red)
        }
    }
}

/** ResumePrompt (PlayerOverlays.tsx): "Bạn đang xem dở tập này", resuming by itself after 8 s */
@Composable
fun ResumePrompt(at: Double, onResume: () -> Unit, onRestart: () -> Unit) {
    var left by remember { mutableIntStateOf(8) }
    LaunchedEffect(Unit) { while (left > 0) { delay(1000); left-- }; onResume() }
    Box(Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.55f)).padding(16.dp), contentAlignment = Alignment.Center) {
        Column(
            Modifier.widthIn(max = 384.dp).fillMaxWidth().clip(rounded(12.dp))
                .background(Brush.linearGradient(listOf(Color.White.copy(alpha = 0.16f), Color.White.copy(alpha = 0.04f), Color.White.copy(alpha = 0.08f))))
                .background(Color(0x99141419)).padding(20.dp),
        ) {
            Text("Bạn đang xem dở tập này", color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Bold)
            Text("Tự xem tiếp sau $left giây", color = Color.White.copy(alpha = 0.7f), fontSize = 14.sp, modifier = Modifier.padding(top = 4.dp))
            Column(Modifier.padding(top = 16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                    Modifier.fillMaxWidth().height(44.dp).pressable(pressedScale = 0.95f, onClick = onResume).clip(Capsule()).background(Color.White),
                    horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically,
                ) {
                    FIcon(LuFilled.Play, size = 16.dp, tint = Color.Black)
                    Text("Xem tiếp từ ${formatTime(at)}", color = Color.Black, fontSize = 14.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 8.dp))
                }
                Row(
                    Modifier.fillMaxWidth().height(44.dp).pressable(pressedScale = 0.95f, onClick = onRestart).glassButton(),
                    horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically,
                ) {
                    LIcon(Lu.RotateCcw, size = 16.dp)
                    Text("Xem từ đầu", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(start = 8.dp))
                }
            }
        }
    }
}
