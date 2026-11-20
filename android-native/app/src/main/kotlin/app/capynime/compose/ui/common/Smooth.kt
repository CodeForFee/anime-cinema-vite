package app.capynime.compose.ui.common

import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.Modifier
import android.app.ActivityManager
import android.content.Context
import android.os.Build
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.grid.LazyGridState
import androidx.compose.foundation.lazy.grid.rememberLazyGridState
import androidx.compose.foundation.lazy.layout.LazyLayoutCacheWindow
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.runtime.Composable

/**
 * How much the phone can take (the web's html[data-lite]). A lite phone gets the same pages without the costly
 * extras: no refracting glass, no shadows, no fades or shimmer, no autoplaying trailer.
 * `adb shell setprop debug.capy.lite 1` forces it, for testing on a strong phone.
 */
object Device {
    var lite = false
        private set

    fun init(context: Context) {
        val am = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val mem = ActivityManager.MemoryInfo().also(am::getMemoryInfo).totalMem
        val forced = runCatching {
            Class.forName("android.os.SystemProperties").getMethod("get", String::class.java).invoke(null, "debug.capy.lite") as String
        }.getOrDefault("") == "1"
        lite = forced || am.isLowRamDevice || mem <= 4L * 1024 * 1024 * 1024 ||
            Runtime.getRuntime().availableProcessors() <= 4 || Build.VERSION.SDK_INT < Build.VERSION_CODES.P
    }
}

/**
 * Lists compose the next screenful while the phone is idle, so a row scrolling in is already built instead of
 * being composed inside the frame that shows it.
 */
@OptIn(ExperimentalFoundationApi::class)
private val Ahead = LazyLayoutCacheWindow(aheadFraction = 1f, behindFraction = 1f)

/** A row of a lazy list in its own layer: scrolling moves it instead of re-recording its drawing every frame */
fun Modifier.row() = graphicsLayer()

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun smoothListState(): LazyListState = rememberLazyListState(Ahead)

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun smoothGridState(): LazyGridState = rememberLazyGridState(Ahead)
