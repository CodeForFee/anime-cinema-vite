import React from "react";
import { Skeleton } from "../lightswind/skeleton";

const BLOCK = "bg-white/10";

/** Placeholder for a grid of poster cards (explore, search) */
export const PosterGridSkeleton: React.FC<{ count?: number }> = ({ count = 12 }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-5 gap-y-8 sm:gap-x-6 sm:gap-y-9">
    {Array.from({ length: count }).map((_, idx) => (
      <Skeleton key={idx} variant="rounded" className={`aspect-[2/3] w-full ${BLOCK}`} />
    ))}
  </div>
);

/** Placeholder for one horizontal shelf: heading + a row of cards */
export const ShelfSkeleton: React.FC = () => (
  <div className="px-4 md:px-12 space-y-3">
    <Skeleton className={`h-7 w-56 ${BLOCK}`} />
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 8 }).map((_, idx) => (
        <Skeleton key={idx} variant="rounded" className={`aspect-[2/3] w-44 md:w-52 flex-shrink-0 ${BLOCK}`} />
      ))}
    </div>
  </div>
);

/** Placeholder for the home page: hero card, then shelves */
export const HomeSkeleton: React.FC = () => (
  <div className="space-y-8 w-full overflow-hidden pb-16 pt-4 md:pt-6">
    <div className="px-4 md:px-12 space-y-4">
      <Skeleton className={`h-7 w-64 ${BLOCK}`} />
      <Skeleton variant="rounded" className={`h-[460px] w-full rounded-3xl lg:h-auto lg:aspect-[3.065/1] ${BLOCK}`} />
    </div>
    <ShelfSkeleton />
    <ShelfSkeleton />
  </div>
);

/** Placeholder for the episode rows in the info modal */
export const EpisodeRowsSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="mt-3">
    {Array.from({ length: count }).map((_, idx) => (
      <div key={idx} className="flex items-center gap-3 sm:gap-5 px-3 sm:px-6 py-5 border-b border-[#404040]">
        <Skeleton className={`h-6 w-8 flex-shrink-0 ${BLOCK}`} />
        <Skeleton className={`aspect-video w-28 sm:w-36 flex-shrink-0 rounded-[4px] ${BLOCK}`} />
        <div className="flex-1 space-y-2">
          <Skeleton className={`h-4 w-1/3 ${BLOCK}`} />
          <Skeleton className={`h-3 w-2/3 ${BLOCK}`} />
        </div>
      </div>
    ))}
  </div>
);
