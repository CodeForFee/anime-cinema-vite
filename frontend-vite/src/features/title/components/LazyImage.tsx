import React, { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import { type Titled, useHdArt } from "@/features/title/hooks/useHdArt";

import { sourceHostSnapshot, subscribeSourceHost } from "@/core/source/hosts";
import { forceHttp2 } from "@/core/source/urls";

function useSourceImage(src?: string) {
  React.useSyncExternalStore(subscribeSourceHost, sourceHostSnapshot);
  return src ? forceHttp2(src) : src;
}

// ponytail: grows with every poster of the session; a few KB of URLs, cap it if sessions get that long
const shown = new Set<string>();

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Shown instead when the image fails to load */
  fallbackSrc?: string;
  /** The title this poster belongs to: its sharp AniList cover replaces src once found (hooks/useHdArt.ts) */
  art?: Titled;
}

/** A plain <img> poster that switches to the title's sharp cover once it is known */
export const PosterImg: React.FC<
  React.ImgHTMLAttributes<HTMLImageElement> & { art?: Titled }
> = ({ art, src, ...props }) => {
  const hd = useHdArt(art)?.cover;
  return <img src={useSourceImage(hd || src)} {...props} />;
};

/**
 * Image that is only fetched when it nears the viewport, with a skeleton in its place until it has loaded.
 * The parent must be positioned (relative/absolute) and sized, since the skeleton fills it.
 */
export const LazyImage: React.FC<LazyImageProps> = ({
  src: sourceSrc,
  art,
  fallbackSrc: givenFallback,
  className,
  loading = "lazy",
  ...props
}) => {
  sourceSrc = useSourceImage(sourceSrc);
  givenFallback = useSourceImage(givenFallback);
  const src = useHdArt(art)?.cover || sourceSrc;
  // a cover that fails to load falls back to the source's own poster
  const fallbackSrc = src !== sourceSrc ? sourceSrc : givenFallback;
  const ref = useRef<HTMLImageElement>(null);
  // Shown before (going back to a page): in place at once, so the back slide does not reveal skeletons
  const seen = Boolean(src && shown.has(src));
  const [loaded, setLoaded] = useState(seen);
  const [failed, setFailed] = useState(false);

  // A cached image can finish before React attaches onLoad, so ask the element itself
  useEffect(() => {
    setFailed(false);
    setLoaded(
      Boolean(src && shown.has(src)) ||
        Boolean(ref.current?.complete && ref.current.naturalWidth > 0),
    );
  }, [src]);

  return (
    <>
      {!loaded && (
        <Skeleton
          aria-hidden
          className="absolute inset-0 rounded-none bg-white/10"
        />
      )}
      <img
        ref={ref}
        src={failed && fallbackSrc ? fallbackSrc : src}
        loading={seen ? "eager" : loading}
        decoding={seen ? "auto" : "async"}
        onLoad={() => {
          if (src) shown.add(src);
          setLoaded(true);
        }}
        onError={() => {
          if (fallbackSrc && !failed) setFailed(true);
          else setLoaded(true);
        }}
        className={cn(
          !seen && "transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
          className,
        )}
        {...props}
      />
    </>
  );
};
