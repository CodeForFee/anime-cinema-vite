package app.capynime.compose

import app.capynime.compose.ui.common.Device
import android.app.Application
import app.capynime.compose.data.HdArt
import app.capynime.compose.data.Library
import app.capynime.compose.data.Source
import coil3.ImageLoader
import coil3.PlatformContext
import coil3.SingletonImageLoader
import coil3.network.okhttp.OkHttpNetworkFetcherFactory
import coil3.request.allowHardware
import coil3.request.crossfade

class CapyApp : Application(), SingletonImageLoader.Factory {
    override fun onCreate() {
        super.onCreate()
        Device.init(this)
        Source.init(this)
        Library.init(this)
        HdArt.init(this)
        // the typeface files parsed once off the main thread: the first text of each weight would stall a frame
        Thread {
            listOf(R.font.be_vietnam_400, R.font.be_vietnam_500, R.font.be_vietnam_600, R.font.be_vietnam_700, R.font.be_vietnam_800, R.font.be_vietnam_900)
                .forEach { runCatching { androidx.core.content.res.ResourcesCompat.getFont(this, it) } }
        }.start()
    }

    /** Posters through the source's own HTTP client: the CDN wants the source Referer */
    override fun newImageLoader(context: PlatformContext): ImageLoader =
        ImageLoader.Builder(context)
            .components { add(OkHttpNetworkFetcherFactory(callFactory = { Source.client })) }
            // a weak phone shows each picture at once: a fade is a translucent redraw per frame
            .crossfade(if (Device.lite) 0 else 300)
            // GPU-resident bitmaps: no texture upload when a poster scrolls back into view
            .allowHardware(true)
            .build()
}
