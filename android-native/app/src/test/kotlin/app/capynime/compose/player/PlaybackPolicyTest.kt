package app.capynime.compose.player

import org.junit.Assert.*
import org.junit.Test

class PlaybackPolicyTest {
    @Test fun acceptsHttpsAndProtocolRelativeLinksWithoutDroppingTokens() {
        assertEquals("https://media.example/video.m3u8?token=a%2Fb", PlaybackPolicy.httpsUrl("//media.example/video.m3u8?token=a%2Fb"))
    }

    @Test fun refusesExecutableOrCredentialBearingLinks() {
        listOf("javascript:alert(1)", "http://media.example/a.mp4", "https://user:password@media.example/a", "https:///missing-host", "https://media.example/a\r\nCookie:x")
            .forEach { url -> assertTrue(url, runCatching { PlaybackPolicy.httpsUrl(url) }.isFailure) }
    }

    @Test fun discoversOnlyHttpsHlsManifestsIncludingSignedUrls() {
        assertTrue(PlaybackPolicy.isDiscoverableHls("https://cdn.example/MASTER.M3U8?expires=999#part"))
        assertFalse(PlaybackPolicy.isDiscoverableHls("https://cdn.example/ad.m3u8.html"))
        assertFalse(PlaybackPolicy.isDiscoverableHls("http://cdn.example/master.m3u8"))
        assertFalse(PlaybackPolicy.isDiscoverableHls("blob:https://cdn.example/video"))
    }

    @Test fun mediaHeadersContainNoCredentialsAndUseActualFrameOrigin() {
        val headers = PlaybackPolicy.mediaHeaders("https://source.example", "https://player.example/embed/42#secret")
        assertEquals(mapOf("Referer" to "https://player.example/embed/42", "Origin" to "https://player.example"), headers)
        assertEquals("https://source.example/", PlaybackPolicy.mediaHeaders("https://source.example", "javascript:bad")["Referer"])
    }

    @Test fun embeddedAdsCannotPromoteTheirOwnManifestToTheNativePlayer() {
        assertTrue(PlaybackPolicy.isFrameRequest("https://player.example/embed/42", "https://player.example/embed/42"))
        assertFalse(PlaybackPolicy.isFrameRequest("https://ad.example/pre-roll", "https://player.example/embed/42"))
        assertFalse(PlaybackPolicy.isFrameRequest(null, "https://player.example/embed/42"))
        assertFalse(PlaybackPolicy.isFrameRequest("http://player.example/embed/42", "https://player.example/embed/42"))
    }

    @Test fun publicHlsMetadataAllowsOpaqueEndpointsWithoutGuessingUnknownFormats() {
        val frame = "https://player.example/embed/42?episode=1"
        val url = "https://media.example/playlist?token=a%2Fb"
        val offer = PlaybackPolicy.mediaOffer(url, "hls", "$frame#animevsub-vsub_extra", frame, false)
        assertEquals(PlaybackPolicy.MediaOffer(url, true), offer)
        assertNull(PlaybackPolicy.mediaOffer(url, "", frame, frame, false))
        assertNull(PlaybackPolicy.mediaOffer(url, "dash", frame, frame, false))
        assertEquals(PlaybackPolicy.MediaOffer(url, true), PlaybackPolicy.mediaOffer(url, "application/vnd.apple.mpegurl", frame, frame, false))
    }

    @Test fun offersFromAnotherEpisodeOrDrmSourceRemainInCompatibilityMode() {
        val frame = "https://player.example/embed/42?episode=1"
        val url = "https://media.example/playlist.m3u8"
        assertNull(PlaybackPolicy.mediaOffer(url, "hls", frame, frame, true))
        assertNull(PlaybackPolicy.mediaOffer(url, "hls", "https://ad.example/embed/42?episode=1", frame, false))
        assertNull(PlaybackPolicy.mediaOffer(url, "hls", "https://player.example/embed/42?episode=2", frame, false))
        assertNull(PlaybackPolicy.mediaOffer("blob:$url", "hls", frame, frame, false))
    }

    @Test fun seeksStayWithinMediaAndHandleBadBridgeValues() {
        assertEquals(0L, PlaybackPolicy.seekMillis(-20.0, 100_000))
        assertEquals(100_000L, PlaybackPolicy.seekMillis(500.0, 100_000))
        assertEquals(12_500L, PlaybackPolicy.seekMillis(12.5))
        assertEquals(0L, PlaybackPolicy.seekMillis(Double.NaN))
        assertEquals(0L, PlaybackPolicy.seekMillis(Double.POSITIVE_INFINITY))
    }

    @Test fun playbackSpeedRejectsNonFiniteAndClampsSupportedRange() {
        assertEquals(1f, PlaybackPolicy.playbackRate(Double.NaN), 0f)
        assertEquals(0.25f, PlaybackPolicy.playbackRate(-1.0), 0f)
        assertEquals(3f, PlaybackPolicy.playbackRate(100.0), 0f)
        assertEquals(1.5f, PlaybackPolicy.playbackRate(1.5), 0f)
    }
}
