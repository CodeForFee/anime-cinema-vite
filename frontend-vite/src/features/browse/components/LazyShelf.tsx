import React, { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { useBrowseQuery } from "@/core/queries";
import { MovieShelf } from "@/features/browse/components/MovieShelf";
import { ShelfSkeleton } from "@/shared/ui/skeletons";
import type { ExploreSearch } from "@/features/browse/components/MovieShelf";

interface LazyShelfProps {
  title: string;
  icon?: LucideIcon;
  /** Source list to show (a path animeApi.browse accepts) */
  path: string;
  seeMore?: ExploreSearch;
}

/**
 * A shelf that only asks the source for its list once it is about to scroll into view,
 * and holds its place with a skeleton until the list arrives.
 */
export const LazyShelf: React.FC<LazyShelfProps> = ({ title, icon, path, seeMore }) => {
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
        <MovieShelf title={title} icon={icon} items={data.items} seeMore={seeMore} />
      ) : (
        <div className="my-5 md:my-8" aria-busy="true" aria-label={`Đang tải ${title}`}>
          <ShelfSkeleton />
        </div>
      )}
    </div>
  );
};
