import { Link } from "@tanstack/react-router"
import { ChevronRight } from "lucide-react"
import type React from "react"

import type { ExploreSearch } from "@/features/browse"

/** The ranked shelf's frame, the same on both forms: its title, "Xem tất cả", then the cards */
export function RankedShelf({ title, seeMore, children }: { title: string; seeMore?: ExploreSearch; children: React.ReactNode }) {
  return (
    <section className="my-8 relative group/top10 select-none">
      <div className="flex items-center justify-between mb-4 px-4 md:px-12">
        <h3 className="font-display text-lg font-bold tracking-tight text-white md:text-2xl">{title}</h3>
        {seeMore && (
          <Link
            to="/explore"
            search={seeMore}
            className="glass-pill flex h-8 items-center gap-1 rounded-full pl-3.5 pr-2.5 text-xs font-semibold text-gray-200 transition-colors hover:text-white"
          >
            Xem tất cả
            <ChevronRight aria-hidden className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}
