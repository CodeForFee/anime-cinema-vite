package app.capynime.compose.player

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.media.AudioManager
import android.view.WindowManager
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectVerticalDragGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.capynime.compose.ui.LIcon
import app.capynime.compose.ui.Lu
import app.capynime.compose.ui.glass.Capsule
import app.capynime.compose.ui.glass.glassButton
import app.capynime.compose.ui.theme.Capy
import kotlinx.coroutines.delay
import kotlin.math.roundToInt

/**
 * Vertical swipes on the video: the left half sets this window's brightness, the right half the media volume
 * (the system's music stream, so it also drives the source player's audio). One full swipe over the player's
 * height covers the whole range. The brightness goes back to the system's when the player leaves the screen.
 */
@Stable
class SwipeAdjust(private val activity: Activity?, private val audio: AudioManager) {
    enum class Kind { Brightness, Volume }

    var kind by mutableStateOf<Kind?>(null)
        private set
    var level by mutableFloatStateOf(0f)
        private set
    /** Bumped on every change, so the indicator stays up while the finger moves and leaves shortly after */
    var tick by mutableStateOf(0)
        private set

    private val maxVolume = audio.getStreamMaxVolume(AudioManager.STREAM_MUSIC).coerceAtLeast(1)
    private var volume = 0f // fractional, so slow swipes still add up to a step

    fun start(right: Boolean) {
        kind = if (right) Kind.Volume else Kind.Brightness
        level = if (right) {
            volume = audio.getStreamVolume(AudioManager.STREAM_MUSIC).toFloat()
            volume / maxVolume
        } else {
            val current = activity?.window?.attributes?.screenBrightness ?: -1f
            // "follow the system" (-1) starts from the middle: the real system value is not readable without a permission
            if (current in 0f..1f) current else 0.5f
        }
        tick++
    }

    /** [fraction] of the player's height, upwards positive */
    fun drag(fraction: Float) {
        when (kind) {
            Kind.Volume -> {
                volume = (volume + fraction * maxVolume).coerceIn(0f, maxVolume.toFloat())
                val step = volume.roundToInt()
                if (step != audio.getStreamVolume(AudioManager.STREAM_MUSIC)) audio.setStreamVolume(AudioManager.STREAM_MUSIC, step, 0)
                level = volume / maxVolume
            }
            Kind.Brightness -> {
                level = (level + fraction).coerceIn(0.01f, 1f)
                activity?.window?.let { w -> w.attributes = w.attributes.apply { screenBrightness = level } }
            }
            null -> return
        }
        tick++
    }

    fun end() { tick++ }

    fun hide() { kind = null }

    fun restoreBrightness() {
        activity?.window?.let { w -> w.attributes = w.attributes.apply { screenBrightness = WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE } }
    }
}

private tailrec fun Context.activity(): Activity? = when (this) {
    is Activity -> this
    is ContextWrapper -> baseContext.activity()
    else -> null
}

@Composable
fun rememberSwipeAdjust(): SwipeAdjust {
    val context = LocalContext.current
    val adjust = remember(context) { SwipeAdjust(context.activity(), context.getSystemService(Context.AUDIO_SERVICE) as AudioManager) }
    DisposableEffect(adjust) { onDispose { adjust.restoreBrightness() } }
    return adjust
}

/** The swipe itself; [enabled] false (screen locked) lets taps through untouched */
fun Modifier.swipeAdjust(adjust: SwipeAdjust, enabled: Boolean): Modifier =
    if (!enabled) this else pointerInput(adjust) {
        detectVerticalDragGestures(
            onDragStart = { at -> adjust.start(right = at.x > size.width / 2) },
            onDragEnd = adjust::end,
            onDragCancel = adjust::end,
        ) { change, dy ->
            change.consume()
            adjust.drag(-dy / (size.height * 0.9f))
        }
    }

/** A small pill at the top: the icon, a bar and the percentage, while swiping and a moment after */
@Composable
fun SwipeAdjustIndicator(adjust: SwipeAdjust, modifier: Modifier = Modifier) {
    val kind = adjust.kind ?: return
    LaunchedEffect(adjust.tick) { delay(700); adjust.hide() }
    Column(
        modifier.padding(top = 16.dp).glassButton(Capsule()).padding(horizontal = 16.dp, vertical = 10.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        androidx.compose.foundation.layout.Row(verticalAlignment = Alignment.CenterVertically) {
            val icon = when {
                kind == SwipeAdjust.Kind.Brightness -> Lu.Sun
                adjust.level <= 0f -> Lu.VolumeX
                else -> Lu.Volume
            }
            LIcon(icon, size = 18.dp, label = if (kind == SwipeAdjust.Kind.Brightness) "Độ sáng" else "Âm lượng")
            Box(Modifier.padding(start = 10.dp).width(120.dp).height(4.dp).clip(Capsule()).background(Color.White.copy(alpha = 0.25f))) {
                Box(Modifier.fillMaxHeight().fillMaxWidth(adjust.level.coerceIn(0f, 1f)).clip(Capsule()).background(if (kind == SwipeAdjust.Kind.Volume) Color.White else Capy.Gold))
            }
            Text(
                "${(adjust.level * 100).roundToInt()}%", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(start = 10.dp).width(40.dp),
            )
        }
    }
}
