import React, { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { useBrowseQuery } from "../../hooks/useAnimeQuery";
import { MovieShelf } from "./MovieShelf";
import { ShelfSkeleton } from "./Skeletons";

interface LazyShelfProps {
  title: string;
  icon?: LucideIcon;
  /** Source list to show (a path animeApi.browse accepts) */
  path: string;
  seeMoreHref?: string;
}

/**
 * A shelf that only asks the source for its list once it is about to scroll into view,
 * and holds its place with a skeleton until the list arrives.
 */
export const LazyShelf: React.FC<LazyShelfProps> = ({ title, icon, path, seeMoreHref }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setNear(true);
      },
      { rootMargin: "400px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [near]);

  const { data, isError } = useBrowseQuery(near ? path : "", 1);

  // The list could not be loaded or is empty: leave no gap, like MovieShelf does for an empty list
  if (isError || (data && data.items.length === 0)) return null;

  return (
    <div ref={ref}>
      {data ? (
        <MovieShelf title={title} icon={icon} items={data.items} seeMoreHref={seeMoreHref} />
      ) : (
        <div className="my-5 md:my-8" aria-busy="true" aria-label={`Đang tải ${title}`}>
          <ShelfSkeleton />
        </div>
      )}
    </div>
  );
};
