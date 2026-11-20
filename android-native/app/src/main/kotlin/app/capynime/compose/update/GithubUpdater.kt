package app.capynime.compose.update

import android.content.Context
import android.content.Intent
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.core.content.FileProvider
import app.capynime.compose.BuildConfig
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import okhttp3.Call
import okhttp3.Callback
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import java.io.File
import java.io.IOException
import java.security.MessageDigest
import java.util.concurrent.TimeUnit
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

enum class UpdatePhase { Idle, Checking, Current, Available, Downloading, Ready, Permission, Error }
data class UpdateState(
    val phase: UpdatePhase = UpdatePhase.Idle,
    val visible: Boolean = false,
    val release: NativeRelease? = null,
    val received: Long = 0,
    val message: String = "",
)

/** Independent from the anime source client: no source cookies, Referer, credentials or GitHub token. */
class GithubUpdater(private val context: Context, private val scope: CoroutineScope) {
    var state by mutableStateOf(UpdateState())
        private set
    private var job: Job? = null
    private var verifiedApk: File? = null
    private var awaitingPermission = false
    private val prefs = context.getSharedPreferences("native-updates", Context.MODE_PRIVATE)
    private val folder = File(context.cacheDir, "updates")
    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS).readTimeout(20, TimeUnit.SECONDS).callTimeout(5, TimeUnit.MINUTES)
        .followSslRedirects(false)
        .addNetworkInterceptor { chain ->
            val request = chain.request()
            if (!UpdatePolicy.trustedUrl(request.url.toString())) throw IOException("Từ chối máy chủ cập nhật không được tin cậy")
            chain.proceed(request)
        }.build()

    init {
        scope.launch(Dispatchers.IO) {
            val cutoff = System.currentTimeMillis() - 24 * 60 * 60 * 1000L
            // Recover partial transfers left by process death; never touch another cache directory.
            folder.listFiles()?.filter { it.isFile && Regex("native-[0-9a-f-]+\\.part").matches(it.name) && it.lastModified() < cutoff }
                ?.forEach { it.delete() }
        }
    }

    fun check(manual: Boolean) {
        if (job?.isCompleted == false) {
            if (manual) state = state.copy(visible = true)
            return
        }
        if (verifiedApk != null && state.phase in setOf(UpdatePhase.Ready, UpdatePhase.Permission)) {
            if (manual) state = state.copy(visible = true)
            return
        }
        val now = System.currentTimeMillis()
        val last = prefs.getLong("last-check", 0)
        if (!manual && now >= last && now - last < CHECK_INTERVAL_MS) return
        // Failed automatic requests are throttled too, so an offline device does not retry every resume.
        prefs.edit().putLong("last-check", now).apply()
        state = UpdateState(UpdatePhase.Checking, visible = manual)
        job = scope.launch {
            try {
                val request = Request.Builder().url("https://api.github.com/repos/${BuildConfig.GITHUB_REPO}/releases?per_page=${UpdatePolicy.MAX_RELEASES}")
                    .header("Accept", "application/vnd.github+json").header("X-GitHub-Api-Version", "2022-11-28")
                    .header("User-Agent", "Capynime-native/${BuildConfig.VERSION_NAME}").build()
                val raw = request(request) { response ->
                    if (!response.isSuccessful) {
                        if (response.code == 403 || response.code == 429) throw IOException("GitHub đang giới hạn lượt kiểm tra. Thử lại sau nhé.")
                        throw IOException("Không kiểm tra được cập nhật (GitHub ${response.code})")
                    }
                    response.body?.byteStream()?.use { input ->
                        val out = java.io.ByteArrayOutputStream()
                        val buffer = ByteArray(16 * 1024)
                        while (true) {
                            val count = input.read(buffer)
                            if (count < 0) break
                            if (out.size() + count > UpdatePolicy.MAX_METADATA_BYTES) throw IOException("Thông tin phiên bản vượt giới hạn")
                            out.write(buffer, 0, count)
                        }
                        out.toString(Charsets.UTF_8.name())
                    } ?: throw IOException("GitHub không trả thông tin phiên bản")
                }
                val release = withContext(Dispatchers.Default) { UpdatePolicy.selectRelease(raw, BuildConfig.GITHUB_REPO, BuildConfig.GITHUB_APK_ASSET) }
                val installedVersion = UpdatePolicy.version(BuildConfig.VERSION_NAME)
                    ?: throw IOException("Không đọc được phiên bản đang cài")
                state = if (release != null && release.version > installedVersion)
                    UpdateState(UpdatePhase.Available, visible = true, release = release)
                else UpdateState(UpdatePhase.Current, visible = state.visible, release = release,
                    message = if (release == null) "Chưa có bản Android native được phát hành trên GitHub." else "Bạn đang dùng phiên bản Android native mới nhất.")
            } catch (e: CancellationException) { throw e }
            catch (e: Exception) {
                state = if (state.visible) UpdateState(UpdatePhase.Error, visible = true, message = safeMessage(e)) else UpdateState()
            }
        }
    }

    fun download() {
        val release = state.release ?: return
        if (job?.isCompleted == false) return
        state = state.copy(phase = UpdatePhase.Downloading, visible = true, received = 0, message = "")
        job = scope.launch {
            var keep = false
            val part = File(folder, "native-${java.util.UUID.randomUUID()}.part")
            val apk = File(folder, "native-update.apk")
            try {
                withContext(Dispatchers.IO) {
                    check(folder.mkdirs() || folder.isDirectory) { "Không tạo được thư mục cập nhật" }
                    check(folder.canonicalFile.parentFile == context.cacheDir.canonicalFile) { "Thư mục cập nhật không hợp lệ" }
                    if (part.exists() && !part.delete()) throw IOException("Không dọn được bản tải trước")
                    if (apk.exists() && !apk.delete()) throw IOException("Không dọn được bản cập nhật trước")
                }
                val digest = MessageDigest.getInstance("SHA-256")
                val request = Request.Builder().url(release.downloadUrl).header("User-Agent", "Capynime-native/${BuildConfig.VERSION_NAME}")
                    .header("Accept", "application/octet-stream").build()
                var lastProgress = 0L
                request(request, onCancelledCleanup = { part.delete() }) { response ->
                    if (!response.isSuccessful) throw IOException("Không tải được APK (GitHub ${response.code})")
                    val body = response.body ?: throw IOException("Bản cập nhật trống")
                    val reported = body.contentLength()
                    if (reported > UpdatePolicy.MAX_APK_BYTES || (reported >= 0 && reported != release.size)) throw IOException("Kích thước APK không khớp GitHub")
                    var received = 0L
                    body.byteStream().use { input ->
                        part.outputStream().use { output ->
                            val buffer = ByteArray(64 * 1024)
                            while (true) {
                                if (job?.isActive != true) throw CancellationException("Đã huỷ cập nhật")
                                val count = input.read(buffer)
                                if (count < 0) break
                                received += count
                                if (received > release.size || received > UpdatePolicy.MAX_APK_BYTES) throw IOException("APK vượt kích thước được công bố")
                                digest.update(buffer, 0, count); output.write(buffer, 0, count)
                                val now = System.currentTimeMillis()
                                if (now - lastProgress >= 200) {
                                    lastProgress = now
                                    val progress = received
                                    scope.launch { if (state.phase == UpdatePhase.Downloading) state = state.copy(received = progress) }
                                }
                            }
                        }
                    }
                    if (received != release.size) throw IOException("Tải APK chưa hoàn tất, vui lòng thử lại")
                    if (!UpdatePolicy.matchesDigest(release.sha256, digest.digest())) throw IOException("Mã SHA-256 của APK không khớp GitHub")
                }
                withContext(Dispatchers.IO) {
                    verify(part, release)
                    if (!part.renameTo(apk)) throw IOException("Không lưu được bản cập nhật")
                }
                verifiedApk = apk; keep = true
                state = state.copy(phase = UpdatePhase.Ready, received = release.size,
                    message = "Đã xác minh ứng dụng, phiên bản và chữ ký. Android sẽ hỏi trước khi cài đặt.")
            } catch (e: CancellationException) {
                state = UpdateState(UpdatePhase.Available, visible = false, release = release)
                throw e
            } catch (e: Exception) {
                state = state.copy(phase = UpdatePhase.Error, message = safeMessage(e))
            } finally {
                withContext(kotlinx.coroutines.NonCancellable + Dispatchers.IO) {
                    part.delete()
                    if (!keep) apk.delete()
                }
            }
        }
    }

    /** Recheck the exact archive immediately before granting read access to Android's installer. */
    fun install() {
        val apk = verifiedApk ?: return
        val release = state.release ?: return
        if (job?.isCompleted == false) return
        job = scope.launch {
            try {
                withContext(Dispatchers.IO) { verify(apk, release) }
                if (!context.packageManager.canRequestPackageInstalls()) {
                    state = state.copy(phase = UpdatePhase.Permission,
                        message = "Cho phép Capynime cài bản cập nhật ở màn hình Android, rồi quay lại ứng dụng.")
                    awaitingPermission = true
                    context.startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${BuildConfig.APPLICATION_ID}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                } else {
                    awaitingPermission = false
                    val uri = FileProvider.getUriForFile(context, "${BuildConfig.APPLICATION_ID}.updates", apk)
                    context.startActivity(Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/vnd.android.package-archive")
                        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK))
                    state = state.copy(phase = UpdatePhase.Ready, visible = false)
                }
            } catch (e: CancellationException) { throw e }
            catch (e: Exception) { state = state.copy(phase = UpdatePhase.Error, visible = true, message = safeMessage(e)) }
        }
    }

    fun onResume() {
        if (awaitingPermission && context.packageManager.canRequestPackageInstalls()) {
            awaitingPermission = false
            install()
        } else if (awaitingPermission) state = state.copy(phase = UpdatePhase.Permission, visible = true)
        else check(manual = false)
    }

    fun dismiss() {
        if (state.phase == UpdatePhase.Checking || state.phase == UpdatePhase.Downloading) job?.cancel()
        awaitingPermission = false
        state = state.copy(visible = false)
    }

    @Suppress("DEPRECATION")
    private fun verify(file: File, release: NativeRelease) {
        if (!file.isFile || file.length() != release.size || file.length() > UpdatePolicy.MAX_APK_BYTES) throw IOException("APK bị thiếu hoặc thay đổi")
        val flags = if (Build.VERSION.SDK_INT >= 28) PackageManager.GET_SIGNING_CERTIFICATES else PackageManager.GET_SIGNATURES
        val manager = context.packageManager
        val archive = manager.getPackageArchiveInfo(file.absolutePath, flags) ?: throw IOException("APK không hợp lệ")
        val installed = manager.getPackageInfo(BuildConfig.APPLICATION_ID, flags)
        if (!UpdatePolicy.compatibleApk(BuildConfig.APPLICATION_ID, code(installed), signers(installed), archive.packageName, code(archive), signers(archive)))
            throw IOException("Từ chối APK khác ứng dụng, cũ hơn hoặc khác chữ ký cài đặt")
        if (UpdatePolicy.version(archive.versionName.orEmpty()) != release.version) throw IOException("Phiên bản trong APK không khớp bản phát hành")
        release.sha256?.let { expected ->
            val hash = MessageDigest.getInstance("SHA-256")
            file.inputStream().use { input -> val buffer = ByteArray(64 * 1024); while (true) { val count = input.read(buffer); if (count < 0) break; hash.update(buffer, 0, count) } }
            if (!UpdatePolicy.matchesDigest(expected, hash.digest())) throw IOException("APK đã thay đổi sau khi tải")
        }
    }

    @Suppress("DEPRECATION")
    private fun code(info: PackageInfo): Long = if (Build.VERSION.SDK_INT >= 28) info.longVersionCode else info.versionCode.toLong()

    @Suppress("DEPRECATION")
    private fun signers(info: PackageInfo): Set<String> {
        val signatures = if (Build.VERSION.SDK_INT >= 28) info.signingInfo?.apkContentsSigners else info.signatures
        return signatures.orEmpty().map { signature -> MessageDigest.getInstance("SHA-256").digest(signature.toByteArray()).joinToString("") { "%02x".format(it) } }.toSet()
    }

    private suspend fun <T> request(request: Request, onCancelledCleanup: () -> Unit = {}, consume: (Response) -> T): T = suspendCancellableCoroutine { continuation ->
        val call = client.newCall(request)
        continuation.invokeOnCancellation { call.cancel() }
        call.enqueue(object : Callback {
            override fun onFailure(call: Call, error: IOException) {
                if (continuation.isActive) continuation.resumeWithException(error)
            }
            override fun onResponse(call: Call, response: Response) {
                try {
                    response.use {
                        try {
                            if (!continuation.isActive) return
                            val result = consume(response)
                            if (continuation.isActive) continuation.resume(result)
                        } catch (e: Exception) {
                            if (continuation.isActive) continuation.resumeWithException(e)
                        }
                    }
                } finally {
                    // Cancellation can resume the caller before this callback closes its Windows file handle.
                    if (continuation.isCancelled) onCancelledCleanup()
                }
            }
        })
    }

    private fun safeMessage(error: Exception): String = when (error) {
        is java.net.UnknownHostException -> "Không có mạng. Kết nối lại rồi thử kiểm tra cập nhật."
        is java.net.SocketTimeoutException -> "GitHub phản hồi chậm. Vui lòng thử lại."
        else -> error.message?.take(200) ?: "Không cập nhật được ứng dụng. Vui lòng thử lại."
    }

    companion object { private const val CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000L }
}
