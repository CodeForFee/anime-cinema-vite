package app.capynime.compose.update

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import java.security.MessageDigest

class UpdatePolicyTest {
    private val repo = "CodeForFee/anime-cinema-vite"
    private val apk = "Capynime-native-release.apk"

    private fun release(tag: String, asset: String = apk, size: Long = 1024, draft: Boolean = false, prerelease: Boolean = false, digest: String? = null): JSONObject =
        JSONObject().put("tag_name", tag).put("name", "Capynime $tag").put("body", "Release notes")
            .put("draft", draft).put("prerelease", prerelease).put("assets", JSONArray().put(
                JSONObject().put("name", asset).put("state", "uploaded").put("size", size)
                    .put("browser_download_url", "https://github.com/$repo/releases/download/$tag/$asset")
                    .apply { if (digest != null) put("digest", digest) },
            ))

    @Test fun webApksNeverBecomeNativeUpdates() {
        val rows = JSONArray().put(release("v2.0.20", "Capynime-2.0.20.apk")).put(release("native-v1.2.0"))
        assertEquals("native-v1.2.0", UpdatePolicy.selectRelease(rows.toString(), repo, apk)?.tag)
        assertNull(UpdatePolicy.selectRelease(JSONArray().put(release("v99.0.0", apk)).toString(), repo, apk))
        assertNull(UpdatePolicy.selectRelease(JSONArray().put(release("native-v99.0.0", "Capynime-99.0.0.apk")).toString(), repo, apk))
    }

    @Test fun selectsHighestStableNativeVersionRatherThanGithubOrdering() {
        val rows = JSONArray().put(release("native-v1.9.0")).put(release("native-v1.10.0"))
            .put(release("native-v3.0.0", draft = true)).put(release("native-v4.0.0", prerelease = true))
            .put(release("native-v5.0.0-rc.1")).put(release("native-v1.2.0"))
        assertEquals("native-v1.10.0", UpdatePolicy.selectRelease(rows.toString(), repo, apk)?.tag)
    }

    @Test fun normalizesStableVersionsAndRejectsPrereleasesOrMalformedNumbers() {
        assertEquals(UpdatePolicy.version("1.1.0"), UpdatePolicy.version("native-v1.1"))
        assertEquals(UpdatePolicy.version("1.1.0"), UpdatePolicy.version("v1.1.0+build7"))
        assertTrue(UpdatePolicy.version("1.10.0")!! > UpdatePolicy.version("1.9.99")!!)
        listOf("1.01.0", "1.0.0-beta", "-1.0.0", "1", "native-v999999999999999999.0.0", "native-v1.0.0/../../bad").forEach {
            assertNull("Rejected version $it", UpdatePolicy.version(it))
        }
    }

    @Test fun onlyTrustedHttpsHostsCanReceiveNetworkRequests() {
        listOf("https://github.com/owner/repo", "https://api.github.com/repos/o/r/releases", "https://release-assets.githubusercontent.com/github-production-release-asset/x?token=value", "https://objects.githubusercontent.com/x").forEach {
            assertTrue(it, UpdatePolicy.trustedUrl(it))
        }
        listOf("http://github.com/o/r", "https://github.com.evil.test/x", "https://evil.github.com/x", "https://user:pass@github.com/x", "https://github.com:444/x", "file:///tmp/update.apk", "https://github.com/x#fragment").forEach {
            assertFalse(it, UpdatePolicy.trustedUrl(it))
        }
    }

    @Test fun initialAssetMustBelongToExactRepositoryTagAndFilename() {
        val tag = "native-v1.2.0"
        val good = "https://github.com/$repo/releases/download/$tag/$apk"
        assertTrue(UpdatePolicy.assetUrl(good, repo, tag, apk))
        assertFalse(UpdatePolicy.assetUrl(good.replace(repo, "attacker/fork"), repo, tag, apk))
        assertFalse(UpdatePolicy.assetUrl(good.replace(tag, "native-v9.0.0"), repo, tag, apk))
        assertFalse(UpdatePolicy.assetUrl("$good?download=1", repo, tag, apk))
        val malicious = release(tag)
        malicious.getJSONArray("assets").getJSONObject(0).put("browser_download_url", "https://evil.test/$apk")
        assertNull(UpdatePolicy.selectRelease(JSONArray().put(malicious).toString(), repo, apk))
    }

    @Test fun enforcesPublishedAssetStateAnd128MibSizeLimit() {
        assertNull(UpdatePolicy.selectRelease(JSONArray().put(release("native-v1.2.0", size = 0)).toString(), repo, apk))
        assertNull(UpdatePolicy.selectRelease(JSONArray().put(release("native-v1.2.0", size = UpdatePolicy.MAX_APK_BYTES + 1)).toString(), repo, apk))
        val pending = release("native-v1.2.0")
        pending.getJSONArray("assets").getJSONObject(0).put("state", "new")
        assertNull(UpdatePolicy.selectRelease(JSONArray().put(pending).toString(), repo, apk))
    }

    @Test fun optionalSha256IsValidatedAndComparedToActualBytes() {
        val bytes = "native apk".toByteArray()
        val hash = MessageDigest.getInstance("SHA-256").digest(bytes)
        val hex = hash.joinToString("") { "%02x".format(it) }
        assertNull(UpdatePolicy.digest(null))
        assertNull(UpdatePolicy.digest("null"))
        assertTrue(UpdatePolicy.matchesDigest(null, hash))
        assertEquals(hex, UpdatePolicy.digest("sha256:${hex.uppercase()}"))
        assertTrue(UpdatePolicy.matchesDigest(hex, hash))
        assertFalse(UpdatePolicy.matchesDigest("0".repeat(64), hash))
        assertThrows(IllegalArgumentException::class.java) { UpdatePolicy.digest("sha256:invalid") }
        assertThrows(IllegalArgumentException::class.java) { UpdatePolicy.digest("sha1:" + "a".repeat(40)) }
        assertNull(UpdatePolicy.selectRelease(JSONArray().put(release("native-v1.2.0", digest = "sha256:invalid")).toString(), repo, apk))
    }

    @Test fun packageAndCodeAndEverySignerMustMatchInstalledApp() {
        val current = "app.capynime.compose"
        val signer = setOf("trusted")
        assertTrue(UpdatePolicy.compatibleApk(current, 2, signer, current, 3, signer))
        assertFalse(UpdatePolicy.compatibleApk(current, 2, signer, "app.capynime", 3, signer))
        assertFalse(UpdatePolicy.compatibleApk(current, 2, signer, current, 2, signer))
        assertFalse(UpdatePolicy.compatibleApk(current, 2, signer, current, 1, signer))
        assertFalse(UpdatePolicy.compatibleApk(current, 2, signer, current, 3, setOf("other")))
        assertFalse(UpdatePolicy.compatibleApk(current, 2, signer, current, 3, signer + "other"))
        assertFalse(UpdatePolicy.compatibleApk(current, 2, emptySet(), current, 3, emptySet()))
    }

    @Test fun releaseScanIsBoundedAndEmptyNativeHistoryIsExplicit() {
        assertNull(UpdatePolicy.selectRelease("[]", repo, apk))
        val rows = JSONArray()
        repeat(UpdatePolicy.MAX_RELEASES) { rows.put(release("v2.0.$it", "Capynime-2.0.$it.apk")) }
        rows.put(release("native-v9.0.0"))
        assertNull(UpdatePolicy.selectRelease(rows.toString(), repo, apk))
    }
}
