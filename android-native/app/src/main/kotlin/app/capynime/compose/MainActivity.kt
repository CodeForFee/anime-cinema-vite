package app.capynime.compose

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import app.capynime.compose.ui.AppRoot
import app.capynime.compose.ui.theme.CapyTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // light icons on the app's own dark background, edge to edge
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT),
        )
        super.onCreate(savedInstanceState)
        setContent { CapyTheme { AppRoot() } }
        // The first WebView of a process loads Chromium (hundreds of ms, more on weak phones). Paid once here, when
        // the home screen is idle, so the first episode starts as fast as in the Capacitor app.
        android.os.Looper.myQueue().addIdleHandler {
            runCatching { android.webkit.WebView(applicationContext).destroy() }
            false
        }
        // no content capture of the Compose tree: walking its semantics on every scroll frame cost the main thread
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
            window.decorView.importantForContentCapture = android.view.View.IMPORTANT_FOR_CONTENT_CAPTURE_NO_EXCLUDE_DESCENDANTS
            window.decorView.post(::noContentCapture)
        }
    }

    /**
     * Compose keeps sending its tree to the system's content capture service whatever the view says; its manager is
     * told there is no session. godkit: reaches into Compose internals by name (names are kept, see
     * proguard-rules.pro); if a Compose update renames them this quietly does nothing and capture comes back.
     */
    private fun noContentCapture() = runCatching {
        fun field(o: Any, name: String) = generateSequence<Class<*>>(o.javaClass) { it.superclass }
            .firstNotNullOf { c -> c.declaredFields.firstOrNull { it.name == name } }.apply { isAccessible = true }
        val content = findViewById<android.view.ViewGroup>(android.R.id.content)
        val compose = (content.getChildAt(0) as android.view.ViewGroup).getChildAt(0)
        val manager = field(compose, "contentCaptureManager").get(compose)!!
        // the session is taken once, when the view attaches: dropping it stops every later capture pass
        field(manager, "contentCaptureSession").set(manager, null)
    }.onFailure { android.util.Log.w("Capy", "content capture still on", it) }
}
