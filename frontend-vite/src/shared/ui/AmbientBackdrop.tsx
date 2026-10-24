import { createPortal } from "react-dom";

/**
 * A title's art, blurred once and fixed behind the page: what the glass cards over it tint.
 * Static, so it costs one paint, not one per scroll frame. Rendered into <body>: as the first child of a
 * page's space-y column it took no room yet pushed the page's real first row a gap further down.
 */
export function AmbientBackdrop({ src }: { src?: string }) {
  if (!src) return null;
  return createPortal(
    <div
      aria-hidden
      className="ambient-backdrop pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <img
        src={src}
        alt=""
        decoding="async"
        className="h-full w-full scale-125 object-cover opacity-60 blur-3xl saturate-150 [transform:translateZ(0)]"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#141414]/20 via-[#141414]/50 to-[#141414]/85" />
    </div>,
    document.body,
  );
}
