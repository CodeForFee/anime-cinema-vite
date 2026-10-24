import { AnimatePresence, m } from "framer-motion";
import type React from "react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/shared/lib/utils";

export interface OverlayProps {
  open: boolean;
  onClose: () => void;
  className?: string;
  /** The scrolling content box, e.g. to scroll it back to the top when the overlay opens */
  contentRef?: React.Ref<HTMLDivElement>;
  children: React.ReactNode;
}

/** While an overlay is open: the page under it does not scroll, Escape closes it */
export function useOverlay(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
}

/** Desktop: a dialog in the middle of the screen over a blurred page; grows in, shrinks away */
export function Dialog({
  open,
  onClose,
  className,
  contentRef,
  children,
}: OverlayProps) {
  useOverlay(open, onClose);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <m.div
            ref={contentRef}
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{
              type: "spring",
              damping: 28,
              stiffness: 380,
              opacity: { duration: 0.18 },
            }}
            className={cn(
              "relative z-[9999] w-full max-w-lg overflow-y-auto rounded-2xl border bg-background shadow-lg",
              className,
            )}
          >
            {children}
          </m.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
