package app.capynime.compose.player

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AudioFile
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.Memory
import androidx.compose.material.icons.rounded.Palette
import androidx.compose.material.icons.rounded.Warning
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.capynime.compose.data.Library
import app.capynime.compose.data.PlayerPrefs
import app.capynime.compose.ui.common.WhiteButton
import app.capynime.compose.ui.glass.pressable
import app.capynime.compose.ui.glass.rounded
import app.capynime.compose.ui.theme.Capy
import app.capynime.compose.ui.glass.Capsule

private enum class Feature(val title: String, val detail: String, val warning: String, val icon: ImageVector) {
    Fsr(
        "Upscale chất lượng",
        "Phóng hình lên độ phân giải màn hình và làm nét viền (AMD FSR)",
        "Tính năng thử nghiệm: xử lý từng khung hình trên GPU nên tốn pin hơn và máy có thể ấm lên; máy yếu có thể giật.",
        Icons.Rounded.AutoAwesome,
    ),
    Anime4k(
        "Upscale Anime4K",
        "Mạng nơ-ron làm nét nét vẽ anime (WebGPU)",
        "Nặng nhất: chạy mạng nơ-ron trên GPU ở mọi khung hình. Chỉ nên bật trên máy mạnh; máy sẽ nóng và hao pin nhanh. Nếu máy không theo kịp, app tự chuyển về Upscale chất lượng.",
        Icons.Rounded.Memory,
    ),
    Vivid(
        "Màu sắc sống động",
        "Màu nhạt đậm lên, giữ tông da, đen sâu hơn",
        "Chỉnh màu từng khung hình trên GPU (nhẹ hơn upscale): màu sẽ đậm và tươi hơn bản gốc một chút. Tốn thêm chút pin.",
        Icons.Rounded.Palette,
    ),
    Surround(
        "Âm thanh vòm 7.1.4",
        "Rạp ảo từ stereo: bass sâu, lời thoại ở giữa, âm bao quanh",
        "Giả lập rạp từ âm thanh stereo (không phải Dolby Atmos thật). Đeo tai nghe để có không gian 3D; dùng loa ngoài thì chọn Loa. Nếu máy đang bật Spatial Audio/Dolby của hệ thống, hãy tắt để tránh xử lý hai lần.",
        Icons.Rounded.AudioFile,
    ),
}

private fun PlayerPrefs.isOn(f: Feature) = when (f) {
    Feature.Fsr -> upscale == "fsr"
    Feature.Anime4k -> upscale == "anime4k"
    Feature.Vivid -> color
    Feature.Surround -> surround
}

private fun PlayerPrefs.turn(f: Feature, on: Boolean) = when (f) {
    Feature.Fsr -> copy(upscale = if (on) "fsr" else "off")
    Feature.Anime4k -> copy(upscale = if (on) "anime4k" else "off")
    Feature.Vivid -> copy(color = on)
    Feature.Surround -> copy(surround = on)
}

/** CapyCinema (EnhanceSheet.tsx): four switches, each asking first with what it costs */
@Composable
fun CinemaPanel(controller: PlayerController) {
    val prefs by Library.player.collectAsState()
    var confirming by remember { mutableStateOf<Feature?>(null) }
    val enhanced = controller.enhanced
    val outdated = controller.ready && enhanced?.error == "outdated"

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        if (controller.nativePlayback) {
            Text("Trình phát Android", color = Color.White, fontWeight = FontWeight.Bold)
            Text("Media3 dùng bộ giải mã của thiết bị để phát video. Upscale FSR/Anime4K, chỉnh màu và âm thanh vòm CapyCinema chạy bằng player nguồn.", color = Capy.TextDim, fontSize = 14.sp, lineHeight = 20.sp)
            if (controller.hasSourcePlayer) WhiteButton("Dùng player nguồn", height = 40.dp) { controller.useSourcePlayer() }
            return@Column
        }
        controller.compatibilityReason?.let { Text(it, color = Capy.Amber, fontSize = 12.sp) }
        val asking = confirming
        if (asking != null) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Rounded.Warning, null, tint = Capy.Amber, modifier = Modifier.size(18.dp))
                Text("  Bật ${asking.title}?", color = Capy.Amber, fontWeight = FontWeight.Bold)
            }
            Text(asking.warning, color = Capy.Text, fontSize = 14.sp, lineHeight = 20.sp)
            Row(Modifier.fillMaxWidth().padding(top = 6.dp), horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.End)) {
                Box(Modifier.height(40.dp).clip(Capsule()).background(Color.White.copy(alpha = 0.1f)).pressable { confirming = null }.padding(horizontal = 18.dp), contentAlignment = Alignment.Center) {
                    Text("Huỷ", color = Color.White, fontWeight = FontWeight.SemiBold)
                }
                WhiteButton("Bật", height = 40.dp) {
                    Library.setPlayer(prefs.turn(asking, true))
                    confirming = null
                }
            }
            return@Column
        }
        Feature.entries.forEach { f ->
            val on = prefs.isOn(f)
            val locked = when {
                outdated -> "Cần bản player mới (tải lại tập)"
                enhanced == null -> null
                f == Feature.Surround && !enhanced.audio -> "Thiết bị không hỗ trợ"
                (f == Feature.Fsr || f == Feature.Vivid) && !enhanced.webgl2 -> "Máy không hỗ trợ WebGL2"
                f == Feature.Anime4k && !enhanced.webgpu -> "Máy chưa hỗ trợ WebGPU"
                else -> null
            }
            val pending = when {
                !on || enhanced == null -> null
                f == Feature.Surround && !enhanced.surround -> "Đang chờ cho phép âm thanh: tự bật khi video phát"
                f == Feature.Anime4k && enhanced.upscale == "fsr" -> "Tạm dùng Upscale chất lượng vì máy không theo kịp"
                (f == Feature.Fsr || f == Feature.Anime4k) && enhanced.upscale == "off" -> "Tạm dừng để giữ mượt"
                f == Feature.Vivid && !enhanced.color -> "Tạm dừng để giữ mượt"
                else -> null
            }
            Column(Modifier.fillMaxWidth().clip(rounded(16.dp)).background(Color.White.copy(alpha = 0.06f)).padding(12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(f.icon, null, tint = if (on) Color.White else Capy.TextDim, modifier = Modifier.size(20.dp))
                    Column(Modifier.weight(1f).padding(horizontal = 10.dp)) {
                        Text(f.title, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                        Text(locked ?: f.detail, color = Capy.TextDim, fontSize = 12.sp, lineHeight = 16.sp)
                    }
                    Switch(on, enabled = on || locked == null) { if (on) Library.setPlayer(prefs.turn(f, false)) else confirming = f }
                }
                if (f == Feature.Surround && on) Row(Modifier.padding(top = 10.dp).fillMaxWidth().clip(rounded(12.dp)).background(Color.Black.copy(alpha = 0.3f)).padding(4.dp)) {
                    listOf("headphones" to "Tai nghe (3D)", "speakers" to "Loa ngoài").forEach { (mode, label) ->
                        val selected = prefs.surroundMode == mode
                        Box(
                            Modifier.weight(1f).height(32.dp).clip(rounded(9.dp)).background(if (selected) Color.White else Color.Transparent)
                                .pressable { Library.setPlayer(prefs.copy(surroundMode = mode)) },
                            contentAlignment = Alignment.Center,
                        ) { Text(label, color = if (selected) Color.Black else Capy.Text, fontSize = 12.sp, fontWeight = FontWeight.SemiBold) }
                    }
                }
                if (pending != null) Text(pending, color = Capy.Amber, fontSize = 12.sp, modifier = Modifier.padding(top = 8.dp))
            }
        }
        enhanced?.error?.takeIf { it != "outdated" }?.let { Text(it, color = Color(0xFFFCA5A5), fontSize = 12.sp) }
    }
}

@Composable
private fun Switch(on: Boolean, enabled: Boolean, onToggle: () -> Unit) {
    val track by animateColorAsState(if (on) Capy.Red else Color.White.copy(alpha = 0.2f), label = "track")
    val x by animateDpAsState(if (on) 22.dp else 2.dp, label = "thumb")
    Box(
        Modifier.width(46.dp).height(26.dp).clip(Capsule()).background(track.copy(alpha = if (enabled) track.alpha else 0.3f))
            .pressable(enabled = enabled, onClick = onToggle),
    ) {
        Box(Modifier.offset(x = x, y = 2.dp).size(22.dp).clip(Capsule()).background(Color.White))
    }
}
