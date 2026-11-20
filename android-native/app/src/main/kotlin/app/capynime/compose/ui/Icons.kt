package app.capynime.compose.ui

import androidx.annotation.DrawableRes
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.addPathNodes
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.composables.icons.lucide.R as L

/** lucide-react, the web's icon set: the same drawings as vector resources */
object Lu {
    val House = L.drawable.lucide_ic_house
    val Compass = L.drawable.lucide_ic_compass
    val CalendarDays = L.drawable.lucide_ic_calendar_days
    val CalendarClock = L.drawable.lucide_ic_calendar_clock
    val Calendar = L.drawable.lucide_ic_calendar
    val Search = L.drawable.lucide_ic_search
    val Bookmark = L.drawable.lucide_ic_bookmark
    val History = L.drawable.lucide_ic_history
    val User = L.drawable.lucide_ic_user
    val Heart = L.drawable.lucide_ic_heart
    val Info = L.drawable.lucide_ic_info
    val Play = L.drawable.lucide_ic_play
    val Star = L.drawable.lucide_ic_star
    val ChevronRight = L.drawable.lucide_ic_chevron_right
    val ChevronLeft = L.drawable.lucide_ic_chevron_left
    val ChevronDown = L.drawable.lucide_ic_chevron_down
    val X = L.drawable.lucide_ic_x
    val Clock = L.drawable.lucide_ic_clock
    val Eye = L.drawable.lucide_ic_eye
    val ArrowLeft = L.drawable.lucide_ic_arrow_left
    val MessageSquare = L.drawable.lucide_ic_message_square
    val LogIn = L.drawable.lucide_ic_log_in
    val LogOut = L.drawable.lucide_ic_log_out
    val Pin = L.drawable.lucide_ic_pin
    val ThumbsUp = L.drawable.lucide_ic_thumbs_up
    val ThumbsDown = L.drawable.lucide_ic_thumbs_down
    val Sparkles = L.drawable.lucide_ic_sparkles
    val Gauge = L.drawable.lucide_ic_gauge
    val Lock = L.drawable.lucide_ic_lock
    val SkipForward = L.drawable.lucide_ic_skip_forward
    val RotateCcw = L.drawable.lucide_ic_rotate_ccw
    val RotateCw = L.drawable.lucide_ic_rotate_cw
    val Pause = L.drawable.lucide_ic_pause
    val Maximize = L.drawable.lucide_ic_maximize
    val Minimize = L.drawable.lucide_ic_minimize
    val Settings = L.drawable.lucide_ic_settings
    val Bell = L.drawable.lucide_ic_bell
    val Trash = L.drawable.lucide_ic_trash_2
    val Send = L.drawable.lucide_ic_send
    val Loader = L.drawable.lucide_ic_loader_circle
    val WifiOff = L.drawable.lucide_ic_wifi_off
    val Alert = L.drawable.lucide_ic_circle_alert
    val Refresh = L.drawable.lucide_ic_refresh_cw
    val Volume = L.drawable.lucide_ic_volume_2
    val VolumeX = L.drawable.lucide_ic_volume_x
    val Plus = L.drawable.lucide_ic_plus
    val Check = L.drawable.lucide_ic_check
    val UserRound = L.drawable.lucide_ic_user_round
    val Mail = L.drawable.lucide_ic_mail
    val KeyRound = L.drawable.lucide_ic_key_round
    val ExternalLink = L.drawable.lucide_ic_external_link
    val Captions = L.drawable.lucide_ic_captions
    val Headphones = L.drawable.lucide_ic_headphones
    val Speaker = L.drawable.lucide_ic_speaker
    val Palette = L.drawable.lucide_ic_palette
    val Cpu = L.drawable.lucide_ic_cpu
    val Wand = L.drawable.lucide_ic_wand_sparkles
    val AlertTriangle = L.drawable.lucide_ic_triangle_alert
    val Layers = L.drawable.lucide_ic_layers
    val ListVideo = L.drawable.lucide_ic_list_video
    val PictureInPicture = L.drawable.lucide_ic_picture_in_picture_2
    val Fullscreen = L.drawable.lucide_ic_expand
    val Share = L.drawable.lucide_ic_share_2
    val Download = L.drawable.lucide_ic_download
}

@Composable
fun LIcon(@DrawableRes icon: Int, modifier: Modifier = Modifier, size: Dp = 20.dp, tint: Color = Color.White, label: String? = null) =
    Icon(painterResource(icon), label, modifier.size(size), tint)

/** lucide's play / star / heart with `fill-current`, as the web draws them in buttons and ratings */
object LuFilled {
    private fun filled(name: String, data: String) = ImageVector.Builder(name, 24.dp, 24.dp, 24f, 24f).apply {
        addPath(
            addPathNodes(data),
            fill = SolidColor(Color.Black),
            stroke = SolidColor(Color.Black),
            strokeLineWidth = 2f,
            strokeLineCap = StrokeCap.Round,
            strokeLineJoin = StrokeJoin.Round,
        )
    }.build()

    val Play = filled("play", "M5,5a2,2 0 0,1 3.008,-1.728l11.997,6.998a2,2 0 0,1 0.003,3.458l-12,7A2,2 0 0,1 5,19Z")
    val Star = filled(
        "star",
        "M11.525,2.295a0.53,0.53 0 0,1 0.95,0l2.31,4.679a2.123,2.123 0 0,0 1.595,1.16l5.166,0.756a0.53,0.53 0 0,1 0.294,0.904l-3.736,3.638a2.123,2.123 0 0,0 -0.611,1.878l0.882,5.14a0.53,0.53 0 0,1 -0.771,0.56l-4.618,-2.428a2.122,2.122 0 0,0 -1.973,0L6.396,21.01a0.53,0.53 0 0,1 -0.77,-0.56l0.881,-5.139a2.122,2.122 0 0,0 -0.611,-1.879L2.16,9.795a0.53,0.53 0 0,1 0.294,-0.906l5.165,-0.755a2.122,2.122 0 0,0 1.597,-1.16Z",
    )
    val Heart = filled(
        "heart",
        "M2,9.5a5.5,5.5 0 0,1 9.591,-3.676a0.56,0.56 0 0,0 0.818,0A5.49,5.49 0 0,1 22,9.5c0,2.29 -1.5,4 -3,5.5l-5.492,5.313a2,2 0 0,1 -3,0.019L5,15c-1.5,-1.5 -3,-3.2 -3,-5.5",
    )
}

@Composable
fun FIcon(icon: ImageVector, modifier: Modifier = Modifier, size: Dp = 20.dp, tint: Color = Color.White, label: String? = null) =
    Icon(icon, label, modifier.size(size), tint)
