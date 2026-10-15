import { createPortal } from "react-dom";
import { Link } from "@/lib/router";

/**
 * A title's art, blurred once and fixed behind the page: what the glass cards over it tint.
 * Static, so it costs one paint, not one per scroll frame. Rendered into <body>: as the first child of a
 * page's space-y column it took no room yet pushed the page's real first row a gap further down.
 */
export function AmbientBackdrop({ src }: { src?: string }) {
  if (!src) return null;
  return createPortal(
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <img
        src={src}
        alt=""
        decoding="async"
        className="h-full w-full scale-125 object-cover opacity-60 blur-3xl saturate-150 [transform:translateZ(0)]"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#141414]/20 via-[#141414]/50 to-[#141414]/85" />
    </div>,
    document.body
  );
}

/** Empty list: a row of glass poster outlines where the titles will go, one line, one way out */
export function EmptyShelf({ line, hint }: { line: string; hint: string }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`glass-card aspect-[2/3] rounded-2xl ${i > 2 ? "hidden sm:block" : ""}`}
            style={{ opacity: 1 - i * 0.16 }}
          />
        ))}
      </div>
      <div>
        <p className="font-display text-lg font-semibold text-white">{line}</p>
        <p className="mt-1 text-sm text-gray-400">
          {hint}{" "}
          <Link href="/explore" className="font-semibold text-white underline decoration-white/30 underline-offset-4 hover:decoration-white">
            Khám phá phim
          </Link>
        </p>
      </div>
    </div>
  );
}
