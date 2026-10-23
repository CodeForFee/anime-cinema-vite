import { type RefObject, useEffect, useState } from "react"

export type Side = "top" | "bottom" | "left" | "right"
export type Align = "start" | "center" | "end"

interface Placement {
  side: Side
  align: Align
  alignOffset: number
  sideOffset: number
}

const MARGIN = 8

/**
 * Where a menu of `menu` size goes next to `trigger` (both viewport rects), kept 8 px inside the viewport; a menu
 * that does not fit below flips above, or gets a `maxHeight` when there is no room either way.
 */
export function placeMenu(
  trigger: Pick<DOMRect, "top" | "bottom" | "left" | "right" | "width" | "height">,
  menu: { width: number; height: number },
  viewport: { width: number; height: number },
  { side, align, alignOffset, sideOffset }: Placement
): { top: number; left: number; maxHeight?: number } {
  let top =
    side === "bottom"
      ? trigger.bottom + sideOffset
      : side === "top"
        ? trigger.top - menu.height - sideOffset
        : trigger.top + trigger.height / 2 - menu.height / 2
  let left =
    side === "right"
      ? trigger.right + sideOffset
      : side === "left"
        ? trigger.left - menu.width - sideOffset
        : align === "start"
          ? trigger.left + alignOffset
          : align === "end"
            ? trigger.right - menu.width - alignOffset
            : trigger.left + trigger.width / 2 - menu.width / 2 + alignOffset

  if (left + menu.width > viewport.width) left = viewport.width - menu.width - MARGIN
  if (left < MARGIN) left = MARGIN

  let maxHeight: number | undefined
  if (top + menu.height > viewport.height) {
    if (side === "bottom" && trigger.top > menu.height + sideOffset) top = trigger.top - menu.height - sideOffset
    else maxHeight = viewport.height - top - MARGIN
  }
  return { top, left, maxHeight }
}

/**
 * Keeps an open menu placed next to its trigger: measured once painted, then again on scroll, resize and when the
 * menu's own size changes. `positioned` turns true after the first measurement, so it can fade in in place.
 */
export function useMenuPosition(open: boolean, trigger: RefObject<HTMLElement | null>, menu: RefObject<HTMLElement | null>, placement: Placement) {
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [positioned, setPositioned] = useState(false)
  const { side, align, alignOffset, sideOffset } = placement

  useEffect(() => {
    if (!open) setPositioned(false)
  }, [open])

  useEffect(() => {
    if (!open || !trigger.current) return
    const update = () => {
      if (!trigger.current) return
      const box = menu.current
      // offsetWidth / offsetHeight: the unscaled size, while the menu is still scaling in
      const next = placeMenu(
        trigger.current.getBoundingClientRect(),
        { width: box?.offsetWidth ?? 0, height: box?.offsetHeight ?? 0 },
        { width: window.innerWidth, height: window.innerHeight },
        { side, align, alignOffset, sideOffset }
      )
      if (box && next.maxHeight !== undefined) box.style.maxHeight = `${next.maxHeight}px`
      setPosition({ top: next.top, left: next.left })
    }
    const settle = () => {
      update()
      setPositioned(true)
    }

    // the portal's content is painted before it is measured
    const frame = requestAnimationFrame(settle)
    const timer = setTimeout(settle, 0)
    const resize = new ResizeObserver(update)
    if (menu.current) resize.observe(menu.current)
    window.addEventListener("scroll", update, true)
    window.addEventListener("resize", update)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(timer)
      resize.disconnect()
      window.removeEventListener("scroll", update, true)
      window.removeEventListener("resize", update)
    }
  }, [open, trigger, menu, side, align, alignOffset, sideOffset])

  return { position, positioned }
}
