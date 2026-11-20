package app.capynime.compose.update

import org.json.JSONArray
import java.net.URI
import java.security.MessageDigest

data class NativeVersion(val major: Long, val minor: Long, val patch: Long) : Comparable<NativeVersion> {
    override fun compareTo(other: NativeVersion): Int = compareValuesBy(this, other, { it.major }, { it.minor }, { it.patch })
}

data class NativeRelease(
    val version: NativeVersion,
    val tag: String,
    val name: String,
    val notes: String,
    val downloadUrl: String,
    val size: Long,
    val sha256: String?,
)

/** Pure policy shared by discovery, transport and APK verification. Web and native releases never mix. */
object UpdatePolicy {
    const val MAX_APK_BYTES = 128L * 1024 * 1024
    const val MAX_RELEASES = 30
    const val MAX_METADATA_BYTES = 2L * 1024 * 1024
    private val versionPattern = Regex("^(?:native-)?v?(0|[1-9][0-9]{0,8})\\.(0|[1-9][0-9]{0,8})(?:\\.(0|[1-9][0-9]{0,8}))?(?:\\+[A-Za-z0-9.-]+)?$")
    private val trustedHosts = setOf("api.github.com", "github.com", "release-assets.githubusercontent.com", "objects.githubusercontent.com", "github-releases.githubusercontent.com")

    fun version(raw: String): NativeVersion? = versionPattern.matchEntire(raw)?.let {
        NativeVersion(it.groupValues[1].toLong(), it.groupValues[2].toLong(), it.groupValues[3].ifEmpty { "0" }.toLong())
    }

    fun trustedUrl(raw: String): Boolean = runCatching {
        val uri = URI(raw)
        uri.scheme == "https" && uri.host?.lowercase() in trustedHosts && uri.userInfo == null &&
            uri.fragment == null && (uri.port == -1 || uri.port == 443)
    }.getOrDefault(false)

    fun assetUrl(raw: String, repo: String, tag: String, asset: String): Boolean = runCatching {
        val uri = URI(raw)
        trustedUrl(raw) && uri.host == "github.com" && uri.rawQuery == null &&
            uri.path == "/$repo/releases/download/$tag/$asset"
    }.getOrDefault(false)

    /** A present but malformed digest is rejected, rather than silently losing integrity checking. */
    fun digest(raw: String?): String? {
        if (raw.isNullOrBlank() || raw == "null") return null
        require(Regex("sha256:[0-9a-fA-F]{64}").matches(raw)) { "Mã kiểm tra APK của GitHub không hợp lệ" }
        return raw.substringAfter(':').lowercase()
    }

    fun matchesDigest(expected: String?, actual: ByteArray): Boolean = expected == null ||
        MessageDigest.isEqual(expected.lowercase().toByteArray(Charsets.US_ASCII), actual.joinToString("") { "%02x".format(it) }.toByteArray(Charsets.US_ASCII))

    fun selectRelease(raw: String, repo: String, assetName: String): NativeRelease? {
        require(Regex("[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+").matches(repo))
        val releases = JSONArray(raw)
        val candidates = mutableListOf<NativeRelease>()
        for (index in 0 until minOf(releases.length(), MAX_RELEASES)) {
            val release = releases.optJSONObject(index) ?: continue
            if (release.optBoolean("draft") || release.optBoolean("prerelease")) continue
            val tag = release.optString("tag_name")
            if (!tag.startsWith("native-v")) continue
            val nativeVersion = version(tag) ?: continue
            val assets = release.optJSONArray("assets") ?: continue
            for (assetIndex in 0 until minOf(assets.length(), 100)) {
                val asset = assets.optJSONObject(assetIndex) ?: continue
                if (asset.optString("name") != assetName || asset.optString("state", "uploaded") != "uploaded") continue
                val size = asset.optLong("size", -1)
                val url = asset.optString("browser_download_url")
                if (size !in 1..MAX_APK_BYTES || !assetUrl(url, repo, tag, assetName)) continue
                val sha = runCatching { digest(asset.optString("digest").takeIf { it.isNotBlank() && it != "null" }) }.getOrElse { continue }
                candidates += NativeRelease(nativeVersion, tag, release.optString("name").ifBlank { tag }.take(160), release.optString("body").take(8000), url, size, sha)
                break
            }
        }
        return candidates.maxByOrNull { it.version }
    }

    fun compatibleApk(installedPackage: String, installedCode: Long, installedSigners: Set<String>, archivePackage: String?, archiveCode: Long, archiveSigners: Set<String>): Boolean =
        archivePackage == installedPackage && archiveCode > installedCode && installedSigners.isNotEmpty() && installedSigners == archiveSigners
}
