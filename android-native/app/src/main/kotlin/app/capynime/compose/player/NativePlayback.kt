package app.capynime.compose.player

import android.content.Context
import android.os.Handler
import android.os.Looper
import androidx.annotation.OptIn
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.TrackGroup
import androidx.media3.common.TrackSelectionOverride
import androidx.media3.common.Tracks
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.okhttp.OkHttpDataSource
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.DefaultRenderersFactory
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import app.capynime.compose.data.Source
import app.capynime.compose.ui.common.Device

/** Media3 is created only for playable media, not while browsing the catalog. */
@OptIn(UnstableApi::class)
internal class NativePlayback(
    context: Context,
    private val onState: (PlayerState, Boolean, String) -> Unit,
    private val onQualities: (List<QualityLevel>) -> Unit,
    private val onFailure: () -> Unit,
) {
    private val handler = Handler(Looper.getMainLooper())
    private var released = false
    private var foreground = true
    private val qualities = mutableListOf<Pair<TrackGroup, Int>>()
    private val data = OkHttpDataSource.Factory(Source.client.newBuilder().followSslRedirects(false).build())
        .setUserAgent(Source.USER_AGENT)
    private val player = ExoPlayer.Builder(context.applicationContext, DefaultRenderersFactory(context.applicationContext).setEnableDecoderFallback(true))
        .setMediaSourceFactory(DefaultMediaSourceFactory(context.applicationContext).setDataSourceFactory(data))
        .setLoadControl(DefaultLoadControl.Builder()
            .setBufferDurationsMs(10_000, if (Device.lite) 20_000 else 40_000, 1000, 2000)
            .setTargetBufferBytes((if (Device.lite) 16 else 32) * 1024 * 1024)
            .setPrioritizeTimeOverSizeThresholds(false)
            .build())
        .setAudioAttributes(AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_MOVIE).build(), true)
        .setHandleAudioBecomingNoisy(true)
        .build()

    val view = PlayerView(context).apply {
        useController = false
        resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIT
        setShowBuffering(PlayerView.SHOW_BUFFERING_NEVER)
        player = this@NativePlayback.player
    }

    private val poll = object : Runnable {
        override fun run() {
            if (released || !foreground) return
            report()
            handler.postDelayed(this, 250)
        }
    }

    init {
        player.addListener(object : Player.Listener {
            override fun onEvents(player: Player, events: Player.Events) {
                report()
            }

            override fun onTracksChanged(tracks: Tracks) {
                qualities.clear()
                val choices = mutableListOf<QualityLevel>()
                tracks.groups.filter { it.type == C.TRACK_TYPE_VIDEO }.forEach { group ->
                    for (track in 0 until group.length) {
                        if (!group.isTrackSupported(track)) continue
                        val format = group.getTrackFormat(track)
                        val height = format.height.coerceAtLeast(0)
                        if (height == 0 || choices.any { it.height == height }) continue
                        val index = qualities.size
                        qualities += group.mediaTrackGroup to track
                        choices += QualityLevel(index, "${height}p", height)
                    }
                }
                onQualities(choices)
            }

            override fun onPlayerError(error: PlaybackException) {
                if (!released) onFailure()
            }
        })
    }

    fun load(url: String, headers: Map<String, String>, position: Double, rate: Double, paused: Boolean, hls: Boolean = false) {
        data.setDefaultRequestProperties(headers)
        player.trackSelectionParameters = player.trackSelectionParameters.buildUpon().clearOverridesOfType(C.TRACK_TYPE_VIDEO).build()
        val item = MediaItem.Builder().setUri(PlaybackPolicy.httpsUrl(url)).apply {
            if (hls) setMimeType(MimeTypes.APPLICATION_M3U8)
        }.build()
        player.setMediaItem(item, PlaybackPolicy.seekMillis(position))
        player.setPlaybackSpeed(PlaybackPolicy.playbackRate(rate))
        player.playWhenReady = !paused
        player.prepare()
        handler.removeCallbacks(poll)
        if (foreground) handler.post(poll)
    }

    private fun report() {
        if (released) return
        val duration = player.duration.takeIf { it != C.TIME_UNSET && it > 0 } ?: 0
        val position = player.currentPosition.coerceAtLeast(0)
        val ready = player.playbackState == Player.STATE_READY || player.playbackState == Player.STATE_ENDED
        view.keepScreenOn = foreground && player.playWhenReady && player.playbackState != Player.STATE_ENDED
        onState(
            PlayerState(
                currentTime = position / 1000.0,
                duration = duration / 1000.0,
                paused = !player.playWhenReady,
                waiting = player.playbackState == Player.STATE_BUFFERING,
                rate = player.playbackParameters.speed.toDouble(),
                ended = player.playbackState == Player.STATE_ENDED,
                ahead = (player.bufferedPosition - position).coerceAtLeast(0) / 1000.0,
            ),
            ready,
            player.videoSize.height.takeIf { it > 0 }?.let { "${it}p" }.orEmpty(),
        )
    }

    /** Gives up on this stream as if Media3 had failed (the controller's start watchdog) */
    fun fail() { if (!released) onFailure() }

    fun play() = player.play()
    fun pause() = player.pause()
    fun seek(seconds: Double) = player.seekTo(PlaybackPolicy.seekMillis(seconds, player.duration))
    fun rate(value: Double) = player.setPlaybackSpeed(PlaybackPolicy.playbackRate(value))
    fun volume(value: Double) { player.volume = if (value.isFinite()) value.toFloat().coerceIn(0f, 1f) else 1f }

    fun quality(index: Int) {
        val builder = player.trackSelectionParameters.buildUpon().clearOverridesOfType(C.TRACK_TYPE_VIDEO)
        if (index >= 0) {
            val (group, track) = qualities.getOrNull(index) ?: return
            builder.addOverride(TrackSelectionOverride(group, listOf(track)))
        }
        player.trackSelectionParameters = builder.build()
    }

    fun onPause() {
        foreground = false
        player.pause()
        view.keepScreenOn = false
        handler.removeCallbacks(poll)
    }

    fun onResume() {
        if (released) return
        foreground = true
        handler.removeCallbacks(poll)
        handler.post(poll)
    }

    fun release() {
        if (released) return
        released = true
        handler.removeCallbacksAndMessages(null)
        view.player = null
        view.keepScreenOn = false
        player.release()
    }
}
