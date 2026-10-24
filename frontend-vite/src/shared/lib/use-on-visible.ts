import { useEffect, useRef } from "react";

/** Calls `fn` whenever `ref` comes within `margin` of the viewport, while `active` (endless lists, lazy sections) */
export function useOnVisible<T extends Element>(fn: () => void, active = true, margin = "600px 0px") {
  const ref = useRef<T>(null);
  const call = useRef(fn);
  call.current = fn;
  useEffect(() => {
    const el = ref.current;
    if (!el || !active) return;
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && call.current(), {
      rootMargin: margin,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [active, margin]);
  return ref;
}
