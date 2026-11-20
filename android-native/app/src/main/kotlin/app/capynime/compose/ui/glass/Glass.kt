package app.capynime.compose.ui.glass

import app.capynime.compose.ui.common.Device
import android.os.Build
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.shadow.Shadow
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.DpOffset
import androidx.compose.ui.unit.dp
import com.kyant.backdrop.Backdrop
import com.kyant.backdrop.drawBackdrop
import com.kyant.backdrop.effects.blur
import com.kyant.backdrop.effects.lens
import com.kyant.backdrop.effects.vibrancy
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.sin

/*
 * The web's glass classes (globals.css) drawn natively. On a phone the web keeps backdrop blur off everything
 * that moves with the page (cards, pills, captions): gradients, light edges and shadows only, so nothing is
 * re-blurred per scroll frame. Only the floating dock refracts the page under it (Kyant backdrop, Android 12+).
 */

/** The page under the dock, recorded for the dock's lens; null below Android 12 */
val LocalScreenBackdrop = staticCompositionLocalOf<Backdrop?> { null }

val glassSupported: Boolean get() = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !Device.lite

/**
 * Draws this subtree once into a GPU texture and reuses it while nothing in it changes: a scrolling poster costs
 * one textured quad per frame instead of its ~15 fills (gradients, rims, captions, badges).
 */
fun Modifier.cached() = graphicsLayer { compositingStrategy = CompositingStrategy.Offscreen }

/** Tailwind `rounded-*` with the app's overrides (xl = 2xl = 8 px, 3xl = 12 px) */
fun rounded(corner: Dp): Shape = RoundedCornerShape(corner)

/** rounded-full */
fun Capsule(): Shape = CircleShape

/** CSS linear-gradient(angle, stops): the line runs through the centre and reaches the far corners */
fun cssLinear(angle: Float, vararg stops: Pair<Float, Color>, size: Size): Brush {
    val rad = Math.toRadians(angle.toDouble())
    val dx = sin(rad).toFloat()
    val dy = -cos(rad).toFloat()
    val half = (abs(size.width * dx) + abs(size.height * dy)) / 2
    val c = Offset(size.width / 2, size.height / 2)
    return Brush.linearGradient(*stops, start = c - Offset(dx, dy) * half, end = c + Offset(dx, dy) * half)
}

/** CSS radial-gradient(rx ry at x y, color, transparent end): an ellipse, drawn as a scaled circle */
fun DrawScope.cssEllipse(rx: Float, ry: Float, center: Offset, color: Color, end: Float) {
    val k = ry / rx
    scale(1f, k, pivot = center) {
        drawRect(
            Brush.radialGradient(0f to color, end to Color.Transparent, center = center, radius = rx),
            topLeft = Offset(0f, center.y - center.y / k),
            size = Size(size.width, size.height / k),
        )
    }
}

/**
 * CSS box-shadow as a RenderNode elevation shadow: drawn by the GPU from the outline, cached by HWUI, nothing
 * blurred per frame (Compose's blurred dropShadow made the render thread the bottleneck while scrolling).
 * The light falls from above, so the offset of the CSS shadow comes by itself.
 */
fun Modifier.dropShadow(shape: Shape, shadow: Shadow): Modifier {
    if (Device.lite) return this
    val c = shadow.color
    return this.shadow((shadow.radius / 2).coerceAtMost(24.dp), shape, clip = false, ambientColor = c.copy(alpha = c.alpha * 0.6f), spotColor = c)
}

/**
 * inset 0 1px 0 rgba(255,255,255,a): a hairline of light inside the top edge, drawn as a line (no blurred inner
 * shadow): straight between the corners, which is where the eye sees it.
 */
private fun Modifier.topLight(shape: Shape, alpha: Float, y: Dp = 1.dp) = drawBehind {
    val inset = minOf(size.height / 2, 12.dp.toPx())
    val w = y.toPx()
    drawLine(Color.White.copy(alpha = alpha), Offset(inset, w / 2), Offset(size.width - inset, w / 2), w)
}

/** inset 0 -1px 0: the same hairline along the bottom edge */
private fun Modifier.bottomLight(alpha: Float) = drawBehind {
    val inset = minOf(size.height / 2, 12.dp.toPx())
    drawLine(Color.White.copy(alpha = alpha), Offset(inset, size.height - 0.5.dp.toPx()), Offset(size.width - inset, size.height - 0.5.dp.toPx()), 1.dp.toPx())
}

/** .glass-pill: "Xem tất cả", the heart on a poster */
fun Modifier.glassPill(shape: Shape = Capsule()) = this
    .clip(shape)
    .drawWithCache {
        val b = cssLinear(150f, 0f to Color.White.copy(alpha = 0.14f), 1f to Color.White.copy(alpha = 0.04f), size = size)
        onDrawBehind { drawRect(b) }
    }
    .topLight(shape, 0.25f)
    .border(1.dp, Color.White.copy(alpha = 0.16f), shape)

/** .glass-button: round controls over pictures (carousel arrows, close) */
fun Modifier.glassButton(shape: Shape = Capsule()) = this
    .clip(shape)
    .drawWithCache {
        val b = cssLinear(140f, 0f to Color.White.copy(alpha = 0.2f), 1f to Color.White.copy(alpha = 0.06f), size = size)
        onDrawBehind { drawRect(b) }
    }
    .topLight(shape, 0.35f)
    .border(1.dp, Color.White.copy(alpha = 0.2f), shape)

/** .glass-card: page panels (watch page, schedule rows) */
fun Modifier.glassCard(shape: Shape = rounded(12.dp)) = this
    .clip(shape)
    .drawWithCache {
        val b = cssLinear(
            150f,
            0f to Color.White.copy(alpha = 0.1f), 0.55f to Color.White.copy(alpha = 0.025f), 1f to Color.White.copy(alpha = 0.05f),
            size = size,
        )
        onDrawBehind { drawRect(b) }
    }
    .topLight(shape, 0.2f)
    .border(1.dp, Color.White.copy(alpha = 0.12f), shape)

/** .glass-chip / .glass-field: inputs and filter chips */
fun Modifier.glassField(shape: Shape) = this
    .clip(shape)
    .drawWithCache {
        val b = cssLinear(135f, 0f to Color.White.copy(alpha = 0.12f), 1f to Color.White.copy(alpha = 0.04f), size = size)
        onDrawBehind { drawRect(b) }
    }
    .topLight(shape, 0.28f)
    .border(1.dp, Color.White.copy(alpha = 0.16f), shape)

/** .card-lift: posters float on a small shadow with a faint ring */
fun Modifier.cardLift(shape: Shape) = this
    .border(1.dp, Color.White.copy(alpha = 0.12f), shape)

/** .glass-rim: the lit edge and sheen over a poster (an overlay: put it on a box over the picture) */
fun Modifier.glassRim(shape: Shape) = this
    .clip(shape)
    .drawWithCache {
        // each gradient filled only where it is not transparent: three full-poster fills per card made scrolling GPU-bound
        val sheenH = size.height * 0.45f
        val sheen = cssLinear(
            160f,
            0f to Color.White.copy(alpha = 0.3f), 0.18f to Color.White.copy(alpha = 0.08f), 0.34f to Color.Transparent,
            size = size,
        )
        val bottomH = 40.dp.toPx()
        val bottom = Brush.verticalGradient(
            0f to Color.Transparent, 1f to Color.Black.copy(alpha = 0.5f),
            startY = size.height - bottomH, endY = size.height,
        )
        val rx = size.width * 1.3f
        val ry = size.height * 0.55f
        val c = Offset(size.width / 2, -size.height * 0.12f)
        val glow = Brush.radialGradient(0f to Color.White.copy(alpha = 0.16f), 0.62f to Color.Transparent, center = c, radius = rx)
        val k = ry / rx
        val glowH = (c.y + ry * 0.62f).coerceAtLeast(0f)
        onDrawBehind {
            drawRect(sheen, size = Size(size.width, sheenH))
            if (glowH > 0f) scale(1f, k, pivot = c) {
                drawRect(glow, topLeft = Offset(0f, c.y - c.y / k), size = Size(size.width, (glowH - c.y) / k + c.y / k))
            }
            drawRect(bottom, topLeft = Offset(0f, size.height - bottomH), size = Size(size.width, bottomH))
        }
    }
    .topLight(shape, 0.55f, 2.dp)
    .border(1.5.dp, Color.White.copy(alpha = 0.32f), shape)

/**
 * .liquid-glass, the floating tab bar: a dark tint so icons stay readable, a top light, and (Android 12+) the
 * page under it blurred and bent at the rim like a drop of glass.
 */
@Composable
fun Modifier.liquidGlass(shape: Shape = Capsule()): Modifier {
    val backdrop = LocalScreenBackdrop.current
    val lifted = dropShadow(shape, Shadow(radius = 40.dp, color = Color.Black.copy(alpha = 0.6f), offset = DpOffset(0.dp, 12.dp)))
    val glass = if (backdrop != null && glassSupported) lifted.drawBackdrop(
        backdrop = backdrop,
        shape = { shape },
        effects = {
            vibrancy()
            blur(22.dp.toPx())
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) lens(12.dp.toPx(), 24.dp.toPx())
        },
        onDrawSurface = { drawLiquidTint(0.8f) },
    ) else lifted.clip(shape).drawWithCache { onDrawBehind { drawLiquidTint(0.96f) } }
    return glass
        .topLight(shape, 0.26f)
        .bottomLight(0.06f)
        .border(1.dp, Color.White.copy(alpha = 0.16f), shape)
}

private fun DrawScope.drawLiquidTint(alpha: Float) {
    drawRect(
        cssLinear(
            135f,
            0f to Color(46, 46, 52).copy(alpha = alpha), 0.55f to Color(16, 16, 20).copy(alpha = (alpha + 0.04f).coerceAtMost(1f)),
            1f to Color(34, 34, 40).copy(alpha = alpha),
            size = size,
        ),
    )
    // ::before: the highlight a curved pane catches from above
    cssEllipse(size.width * 1.2f, size.height * 0.9f, Offset(size.width * 0.16f, -size.height * 0.2f), Color.White.copy(alpha = 0.16f), 0.55f)
}

/** .liquid-glass-lens: the picked tab, amber solid in the middle bleeding out to the edge */
fun Modifier.goldLens(shape: Shape = Capsule()) = this
    .dropShadow(shape, Shadow(radius = 20.dp, color = Color(0x80FFB800)))
    .clip(shape)
    .drawWithCache {
        val r = maxOf(size.width * 1.15f, size.height * 1.3f) / 2
        val b = Brush.radialGradient(
            0f to Color(255, 200, 48).copy(alpha = 0.97f), 0.42f to Color(255, 184, 0).copy(alpha = 0.82f), 1f to Color(255, 150, 0).copy(alpha = 0.22f),
            center = Offset(size.width / 2, size.height * 0.45f), radius = r,
        )
        onDrawBehind { drawRect(b) }
    }
    .topLight(shape, 0.5f)

/** Press feedback: the web's `active:scale-[0.97]` (haptic tick where the web calls haptic()) */
@Composable
fun Modifier.pressable(enabled: Boolean = true, role: Role = Role.Button, haptic: Boolean = false, pressedScale: Float = 0.97f, onClick: () -> Unit): Modifier {
    val source = remember { MutableInteractionSource() }
    val pressed by source.collectIsPressedAsState()
    val scale = animateFloatAsState(if (pressed) pressedScale else 1f, spring(stiffness = Spring.StiffnessMedium), label = "press")
    val haptics = LocalHapticFeedback.current
    // the scale is read while drawing the layer, so a press animates without recomposing the card
    return graphicsLayer { scaleX = scale.value; scaleY = scale.value }.clickable(source, indication = null, enabled = enabled, role = role) {
        if (haptic) haptics.performHapticFeedback(HapticFeedbackType.ContextClick)
        onClick()
    }
}

/** Sheets over the page or the playing video (.glass-sheet): denser tint, no blur */
fun Modifier.glassSheet(corner: Dp = 16.dp) = clip(RoundedCornerShape(topStart = corner, topEnd = corner))
    .drawWithCache {
        val b = cssLinear(160f, 0f to Color(40, 40, 52).copy(alpha = 0.97f), 1f to Color(14, 14, 20).copy(alpha = 0.98f), size = size)
        onDrawBehind { drawRect(b) }
    }
