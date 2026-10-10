
import React, { useEffect, useRef, useState } from "react";
import { Skeleton } from "../lightswind/skeleton";
import { cn } from "../../lib/utils";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Shown instead when the image fails to load */
  fallbackSrc?: string;
}

/**
 * Image that is only fetched when it nears the viewport, with a skeleton in its place until it has loaded.
 * The parent must be positioned (relative/absolute) and sized, since the skeleton fills it.
 */
export const LazyImage: React.FC<LazyImageProps> = ({ src, fallbackSrc, className, loading = "lazy", ...props }) => {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  // A cached image can finish before React attaches onLoad, so ask the element itself
  useEffect(() => {
    setFailed(false);
    setLoaded(Boolean(ref.current?.complete && ref.current.naturalWidth > 0));
  }, [src]);

  return (
    <>
      {!loaded && <Skeleton aria-hidden className="absolute inset-0 rounded-none bg-white/10" />}
      <img
        ref={ref}
        src={failed && fallbackSrc ? fallbackSrc : src}
        loading={loading}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (fallbackSrc && !failed) setFailed(true);
          else setLoaded(true);
        }}
        className={cn("transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0", className)}
        {...props}
      />
    </>
  );
};
