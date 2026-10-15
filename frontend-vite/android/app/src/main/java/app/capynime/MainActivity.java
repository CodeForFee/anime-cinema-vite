package app.capynime;

import android.content.Context;
import android.content.pm.ActivityInfo;
import android.content.res.Resources;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.view.WindowManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.webkit.ServiceWorkerClientCompat;
import androidx.webkit.JavaScriptReplyProxy;
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
import java.util.Locale;

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
        // The WebView's own scrollbar flashed up as the page loaded (over the launch intro); the app has no
        // use for a browser scrollbar
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);

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

        // window.AvsNative, callable by the app's own pages only:
        //   "fullscreen:on" | "fullscreen:off"
        //   "volume:<0..1>"      system media volume (the one the hardware buttons change)
        //   "brightness:<0..1>"  screen brightness of this window, as video players do
        //   "query"              replies {"volume":..,"brightness":..} with the current levels
        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            Uri app = Uri.parse(getBridge().getLocalUrl());
            WebViewCompat.addWebMessageListener(
                webView,
                "AvsNative",
                Collections.singleton(app.getScheme() + "://" + app.getHost()),
                (view, message, sourceOrigin, isMainFrame, replyProxy) ->
                    runOnUiThread(() -> onAppMessage(message.getData(), replyProxy))
            );
        }
    }

    private void onAppMessage(String data, JavaScriptReplyProxy reply) {
        if (data == null) return;
        try {
            if (data.startsWith("fullscreen:")) setFullscreen("fullscreen:on".equals(data));
            else if (data.startsWith("volume:")) setVolume(Float.parseFloat(data.substring(7)));
            else if (data.startsWith("brightness:")) setBrightness(Float.parseFloat(data.substring(11)));
            else if ("query".equals(data)) {
                reply.postMessage(String.format(Locale.US, "{\"volume\":%.3f,\"brightness\":%.3f}", getVolume(), getBrightness()));
            }
        } catch (RuntimeException ignored) {
            // a malformed number or a stream the system will not let us change: leave things as they are
        }
    }

    private AudioManager audio() {
        return (AudioManager) getSystemService(Context.AUDIO_SERVICE);
    }

    private void setVolume(float level) {
        AudioManager audio = audio();
        int max = audio.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
        // flag 0: no system volume panel, the player draws its own level
        audio.setStreamVolume(AudioManager.STREAM_MUSIC, Math.round(clamp(level) * max), 0);
    }

    private float getVolume() {
        AudioManager audio = audio();
        return audio.getStreamVolume(AudioManager.STREAM_MUSIC) / (float) audio.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
    }

    private void setBrightness(float level) {
        WindowManager.LayoutParams attributes = getWindow().getAttributes();
        // never fully black: 1 % is the floor
        attributes.screenBrightness = Math.max(0.01f, clamp(level));
        getWindow().setAttributes(attributes);
    }

    /** This window's brightness, or the system setting while the window follows it */
    private float getBrightness() {
        float own = getWindow().getAttributes().screenBrightness;
        if (own >= 0) return own;
        int maxId = Resources.getSystem().getIdentifier("config_screenBrightnessSettingMaximum", "integer", "android");
        int max = maxId != 0 ? Resources.getSystem().getInteger(maxId) : 255;
        int value = Settings.System.getInt(getContentResolver(), Settings.System.SCREEN_BRIGHTNESS, max / 2);
        return clamp(value / (float) Math.max(1, max));
    }

    private static float clamp(float value) {
        return Math.max(0f, Math.min(1f, value));
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
            // leaving the player hands brightness back to the system
            WindowManager.LayoutParams attributes = getWindow().getAttributes();
            attributes.screenBrightness = WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE;
            getWindow().setAttributes(attributes);
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
