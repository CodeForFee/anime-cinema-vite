import { AnimatePresence, m, useDragControls } from "framer-motion"
import { createPortal } from "react-dom"

import { haptic } from "@/platform/haptics"
import { cn } from "@/shared/lib/utils"
import { type OverlayProps, useOverlay } from "@/shared/ui/dialog"

/** The closing slide, fixed (not a spring) so what follows it can start right after it (the player rising) */
export const SHEET_EXIT_MS = 280

/**
 * Mobile: a sheet that rises from the bottom edge on a spring. It is pulled down to close by its grabber or by
 * any area marked [data-sheet-handle]; the rest of its content scrolls normally. No backdrop blur: blurring the
 * whole page on every frame of the slide stutters on phones.
 */
export function Sheet({ open, onClose, className, contentRef, children }: OverlayProps) {
  const drag = useDragControls()
  useOverlay(open, onClose)

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center">
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
          />
          <m.div
            ref={contentRef}
            role="dialog"
            aria-modal="true"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%", transition: { type: "tween", duration: SHEET_EXIT_MS / 1000, ease: [0.32, 0.72, 0, 1] } }}
            transition={{ type: "spring", damping: 32, stiffness: 320, mass: 0.9 }}
            drag="y"
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onPointerDown={(event) => {
              const target = event.target as Element
              if (target.closest("[data-sheet-handle]") && !target.closest("button, a, input")) drag.start(event)
            }}
            onDragEnd={(_event, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) {
                haptic()
                onClose()
              }
            }}
            className={cn("relative z-[9999] w-full overflow-y-auto bg-background shadow-lg", className)}
          >
            <div
              aria-hidden
              onPointerDown={(event) => drag.start(event)}
              className="sticky top-0 z-40 -mb-7 flex h-7 w-full cursor-grab touch-none items-center justify-center"
            >
              <span className="h-1.5 w-10 rounded-full bg-white/45 shadow-[0_1px_4px_rgba(0,0,0,0.6)]" />
            </div>
            {children}
          </m.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
