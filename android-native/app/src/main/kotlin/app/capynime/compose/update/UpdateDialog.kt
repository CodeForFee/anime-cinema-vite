package app.capynime.compose.update

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import app.capynime.compose.BuildConfig
import app.capynime.compose.ui.LIcon
import app.capynime.compose.ui.Lu
import app.capynime.compose.ui.theme.Capy
import java.util.Locale

@Composable
fun rememberGithubUpdater(): GithubUpdater {
    val context = LocalContext.current.applicationContext
    val scope = rememberCoroutineScope()
    val updater = remember(context, scope) { GithubUpdater(context, scope) }
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    DisposableEffect(lifecycle, updater) {
        val observer = LifecycleEventObserver { _, event -> if (event == Lifecycle.Event.ON_RESUME) updater.onResume() }
        lifecycle.addObserver(observer)
        onDispose { lifecycle.removeObserver(observer) }
    }
    LaunchedEffect(updater) { updater.check(manual = false) }
    return updater
}

@Composable
fun UpdateDialog(updater: GithubUpdater) {
    val state = updater.state
    if (!state.visible) return
    val release = state.release
    val colors = ButtonDefaults.textButtonColors(contentColor = Capy.Gold)
    AlertDialog(
        onDismissRequest = updater::dismiss,
        icon = { LIcon(Lu.Download, tint = Capy.Gold, size = 26.dp) },
        title = { Text("Cập nhật Capynime", fontSize = 21.sp, fontWeight = FontWeight.Bold) },
        containerColor = Capy.Card,
        titleContentColor = Color.White,
        textContentColor = Capy.Gray300,
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Đang cài: ${BuildConfig.VERSION_NAME} · Android native", color = Capy.TextDim, fontSize = 12.sp)
                when (state.phase) {
                    UpdatePhase.Checking -> Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        CircularProgressIndicator(Modifier.size(22.dp), color = Capy.Red, strokeWidth = 2.dp)
                        Text("Đang kiểm tra GitHub...", fontSize = 14.sp)
                    }
                    UpdatePhase.Downloading -> {
                        Text("Đang tải ${release?.name.orEmpty()}", color = Color.White, fontSize = 14.sp)
                        LinearProgressIndicator(
                            progress = { (state.received.toFloat() / (release?.size ?: 1L)).coerceIn(0f, 1f) },
                            modifier = Modifier.fillMaxWidth(), color = Capy.Gold, trackColor = Color.White.copy(alpha = 0.1f),
                        )
                        Text("${mib(state.received)} / ${mib(release?.size ?: 0)} MiB", color = Capy.TextDim, fontSize = 12.sp)
                    }
                    UpdatePhase.Available -> {
                        Text("Có phiên bản mới: ${release?.tag.orEmpty()}", color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                        Text("Tải từ GitHub · ${mib(release?.size ?: 0)} MiB", color = Capy.TextDim, fontSize = 12.sp)
                    }
                    else -> Text(state.message, fontSize = 14.sp)
                }
                if (release != null && state.phase in setOf(UpdatePhase.Available, UpdatePhase.Ready, UpdatePhase.Permission) && release.notes.isNotBlank()) {
                    Text(release.notes, fontSize = 13.sp, modifier = Modifier.fillMaxWidth().heightIn(max = 200.dp).verticalScroll(rememberScrollState()))
                }
            }
        },
        confirmButton = {
            when (state.phase) {
                UpdatePhase.Available -> TextButton(onClick = updater::download, colors = colors) { Text("Tải bản cập nhật") }
                UpdatePhase.Ready -> TextButton(onClick = updater::install, colors = colors) { Text("Cài đặt") }
                UpdatePhase.Permission -> TextButton(onClick = updater::install, colors = colors) { Text("Mở quyền cài đặt") }
                UpdatePhase.Error -> TextButton(onClick = { if (release != null) updater.download() else updater.check(manual = true) }, colors = colors) { Text("Thử lại") }
                UpdatePhase.Current -> TextButton(onClick = { updater.check(manual = true) }, colors = colors) { Text("Kiểm tra lại") }
                else -> Unit
            }
        },
        dismissButton = {
            TextButton(onClick = updater::dismiss, colors = ButtonDefaults.textButtonColors(contentColor = Capy.Gray300)) {
                Text(if (state.phase == UpdatePhase.Downloading) "Huỷ tải" else "Đóng")
            }
        },
    )
}

private fun mib(bytes: Long) = String.format(Locale.ROOT, "%.1f", bytes / (1024.0 * 1024))
