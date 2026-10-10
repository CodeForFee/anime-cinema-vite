package app.animecinema.vite;

import android.content.pm.ActivityInfo;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.webkit.ServiceWorkerClientCompat;
import androidx.webkit.ServiceWorkerControllerCompat;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;

public class MainActivity extends BridgeActivity {

    /** Origin of the source's player page, the only frame player-bridge.js is injected into. */
    private static final String PLAYER_ORIGIN = "https://storage.googleapiscdn.com";

    /**
     * Ad requests answered with an empty body instead of reaching the network. Same list as
     * animevietsub-adshield-extension/rules.json; keep in sync with the extension's ad-rules.ts.
     */
    private static final String[] AD_URL_PARTS = {
        "adqc.net",
        "popads.net",
        "adsterra.com",
        "propellerads.com",
        "/static/jwplayer/vast.js",
        "/admin/api/ads/active"
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView webView = getBridge().getWebView();

        getBridge().setWebViewClient(
            new BridgeWebViewClient(getBridge()) {
                @Override
                public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                    WebResourceResponse blocked = blockIfAd(request);
                    return blocked != null ? blocked : super.shouldInterceptRequest(view, request);
                }
            }
        );
        // The player page registers a service worker; what it fetches never reaches the client above
        if (WebViewFeature.isFeatureSupported(WebViewFeature.SERVICE_WORKER_BASIC_USAGE)) {
            ServiceWorkerControllerCompat.getInstance().setServiceWorkerClient(
                new ServiceWorkerClientCompat() {
                    @Override
                    public WebResourceResponse shouldInterceptRequest(WebResourceRequest request) {
                        WebResourceResponse blocked = blockIfAd(request);
                        return blocked != null ? blocked : getBridge().getLocalServer().shouldInterceptRequest(request);
                    }
                }
            );
        }

        // Ad shield + remote control for the embedded player (public/player-bridge.js)
        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            String script = readAsset("public/player-bridge.js");
            if (script != null) {
                WebViewCompat.addDocumentStartJavaScript(webView, script, Collections.singleton(PLAYER_ORIGIN));
            }
        }

        // window.AvsNative.postMessage("fullscreen:on" | "fullscreen:off"), callable by the app's own pages only
        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            Uri app = Uri.parse(getBridge().getLocalUrl());
            WebViewCompat.addWebMessageListener(
                webView,
                "AvsNative",
                Collections.singleton(app.getScheme() + "://" + app.getHost()),
                (view, message, sourceOrigin, isMainFrame, replyProxy) ->
                    runOnUiThread(() -> setFullscreen("fullscreen:on".equals(message.getData())))
            );
        }
    }

    /** An empty response for an ad URL, null for anything else. */
    private WebResourceResponse blockIfAd(WebResourceRequest request) {
        String url = request.getUrl().toString();
        for (String part : AD_URL_PARTS) {
            if (url.contains(part)) {
                return new WebResourceResponse("text/plain", "utf-8", new ByteArrayInputStream(new byte[0]));
            }
        }
        return null;
    }

    /** Landscape with the system bars hidden while the web player is in its full-screen mode. */
    private void setFullscreen(boolean on) {
        setRequestedOrientation(
            on ? ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE : ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
        );
        WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (on) {
            bars.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            bars.hide(WindowInsetsCompat.Type.systemBars());
        } else {
            bars.show(WindowInsetsCompat.Type.systemBars());
        }
    }

    private String readAsset(String path) {
        try (InputStream in = getAssets().open(path); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = in.read(buffer)) != -1) out.write(buffer, 0, read);
            return out.toString(StandardCharsets.UTF_8.name());
        } catch (IOException e) {
            return null;
        }
    }
}
