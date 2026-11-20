package app.capynime.compose.ui.glass

import app.capynime.compose.ui.common.Device
import android.os.Build
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import app.capynime.compose.ui.theme.Capy
import app.capynime.compose.ui.theme.Ink
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

val glassSupported: Boolean get() = false // the live lens re-rendered the page under the dock every frame

/**
 * Draws this subtree once into a GPU texture and reuses it while nothing in it changes: a scrolling poster costs
 * one textured quad per frame instead of its ~15 fills (gradients, rims, captions, badges).
 */
fun Modifier.cached() = this // flat cards need no offscreen texture per card

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
fun Modifier.dropShadow(shape: Shape, shadow: Shadow): Modifier = this // flat: no elevation shadows

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

/*
 * "Cinema ink" (2026-11 redesign): flat surfaces with one hairline, no gradients, sheens, shadows or blur. Every
 * card is one fill and one stroke, so a scrolling list costs the GPU almost nothing on any phone.
 */

/** Small round controls and chips over the page ("Xem tất cả", the heart on a poster) */
fun Modifier.glassPill(shape: Shape = Capsule()) = this
    .clip(shape)
    .background(Ink.Raised)
    .border(1.dp, Ink.Line, shape)

/** Round controls over pictures (carousel arrows, close): a dark disc that reads on any image */
fun Modifier.glassButton(shape: Shape = Capsule()) = this
    .clip(shape)
    .background(Color.Black.copy(alpha = 0.55f))
    .border(1.dp, Color.White.copy(alpha = 0.14f), shape)

/** Page panels (watch page, schedule rows) */
fun Modifier.glassCard(shape: Shape = rounded(16.dp)) = this
    .clip(shape)
    .background(Ink.Card)
    .border(1.dp, Ink.Line, shape)

/** Inputs and filter chips */
fun Modifier.glassField(shape: Shape) = this
    .clip(shape)
    .background(Ink.Raised)
    .border(1.dp, Ink.Line, shape)

/** Posters: a hairline ring only */
fun Modifier.cardLift(shape: Shape) = this.border(1.dp, Ink.Line, shape)

/** Over a poster: a short dark fade at the bottom so a caption on it stays readable (one fill) */
fun Modifier.glassRim(shape: Shape) = this
    .clip(shape)
    .drawWithCache {
        val h = size.height * 0.4f
        val fade = Brush.verticalGradient(0f to Color.Transparent, 1f to Color.Black.copy(alpha = 0.75f), startY = size.height - h, endY = size.height)
        onDrawBehind { drawRect(fade, topLeft = Offset(0f, size.height - h), size = Size(size.width, h)) }
    }

/** The bottom bar: solid, so nothing behind it is drawn again for it */
@Composable
fun Modifier.liquidGlass(shape: Shape = Capsule()): Modifier = this.clip(shape).background(Ink.Card).border(1.dp, Ink.Line, shape)

/** The picked tab's mark */
fun Modifier.goldLens(shape: Shape = Capsule()) = this.clip(shape).background(Capy.Red.copy(alpha = 0.16f))

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

/** Sheets over the page or the playing video: solid, rounded top */
fun Modifier.glassSheet(corner: Dp = 20.dp) = clip(RoundedCornerShape(topStart = corner, topEnd = corner)).background(Ink.Card)
