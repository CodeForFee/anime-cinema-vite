package app.capynime.compose.ui.theme

import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.LineHeightStyle
import androidx.compose.ui.unit.sp
import app.capynime.compose.R

/** The web app's tokens (tailwind.config.ts, globals.css) plus the Tailwind palette steps the pages use */
object Capy {
    /** The page (html/body behind every route on the phone) */
    val Page = Color(0xFF141414)
    val Background = Color(0xFF08090D)
    /** bg-[#1c1c1f]: hero card, carousel cards */
    val Card = Color(0xFF1C1C1F)
    val Surface = Color(0xFF10121A)
    val SurfaceLight = Color(0xFF181B26)
    val Red = Color(0xFFE50914)
    val Gold = Color(0xFFFFB800)
    val GoldBright = Color(0xFFFFC830)
    val Amber200 = Color(0xFFFDE68A)
    val Amber = Color(0xFFFCD34D) // amber-300
    val Amber400 = Color(0xFFFBBF24)
    val Amber500 = Color(0xFFF59E0B)
    val Emerald = Color(0xFF34D399)
    val Emerald600 = Color(0xFF059669)
    val Text = Color(0xFFECEDEE)
    val Gray200 = Color(0xFFE5E7EB)
    val Gray300 = Color(0xFFD1D5DB)
    val TextDim = Color(0xFF9CA3AF) // gray-400
    val TextFaint = Color(0xFF6B7280) // gray-500
    val Stroke = Color.White.copy(alpha = 0.12f)
}

/** "Be Vietnam Pro", the web's one typeface (@fontsource/be-vietnam-pro 400-900) */
val BeVietnam = FontFamily(
    Font(R.font.be_vietnam_400, FontWeight.Normal),
    Font(R.font.be_vietnam_500, FontWeight.Medium),
    Font(R.font.be_vietnam_600, FontWeight.SemiBold),
    Font(R.font.be_vietnam_700, FontWeight.Bold),
    Font(R.font.be_vietnam_800, FontWeight.ExtraBold),
    Font(R.font.be_vietnam_900, FontWeight.Black),
)

private val scheme = darkColorScheme(
    primary = Capy.Red,
    onPrimary = Color.White,
    secondary = Capy.Gold,
    background = Capy.Page,
    onBackground = Capy.Text,
    surface = Capy.Page,
    onSurface = Capy.Text,
    surfaceVariant = Capy.SurfaceLight,
    onSurfaceVariant = Capy.TextDim,
    outline = Capy.Stroke,
)

/** CSS line boxes: text sits centred in its line height, without the font's extra top/bottom padding */
private val base = TextStyle(
    fontFamily = BeVietnam,
    color = Capy.Text,
    lineHeightStyle = LineHeightStyle(LineHeightStyle.Alignment.Center, LineHeightStyle.Trim.None),
)

private val type = Typography().run {
    copy(
        displayLarge = displayLarge.merge(base), displayMedium = displayMedium.merge(base), displaySmall = displaySmall.merge(base),
        headlineLarge = headlineLarge.merge(base), headlineMedium = headlineMedium.merge(base), headlineSmall = headlineSmall.merge(base),
        titleLarge = titleLarge.merge(base), titleMedium = titleMedium.merge(base), titleSmall = titleSmall.merge(base),
        bodyLarge = bodyLarge.merge(base), bodyMedium = bodyMedium.merge(base), bodySmall = bodySmall.merge(base),
        labelLarge = labelLarge.merge(base), labelMedium = labelMedium.merge(base), labelSmall = labelSmall.merge(base),
    )
}

@Composable
fun CapyTheme(content: @Composable () -> Unit) = MaterialTheme(colorScheme = scheme, typography = type) {
    // Text() without a style reads LocalTextStyle: the web's body text, 16 px Be Vietnam Pro
    CompositionLocalProvider(LocalTextStyle provides base.copy(fontSize = 16.sp, lineHeight = 24.sp), content = content)
}

val Caption = TextStyle(fontSize = 11.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 0.6.sp)
