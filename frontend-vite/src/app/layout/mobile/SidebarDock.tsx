import React from "react";
import { motion } from "framer-motion";
import { Bookmark, Compass, History, Home, Search } from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import { haptic } from "@/platform/haptics";
import { cn } from "@/shared/lib/utils";

const MOBILE_NAV_LINKS = [
  { label: "Trang chủ", href: "/", icon: Home },
  { label: "Khám phá", href: "/explore", icon: Compass },
  { label: "Tìm kiếm", href: "/search", icon: Search },
  { label: "Danh sách", href: "/favorites", icon: Bookmark },
  { label: "Lịch sử", href: "/history", icon: History },
] as const;

/**
 * Phone / narrow screens only: a floating glass pill of icons (styles: .liquid-glass in globals.css).
 * The lit "lens" slides from the old tab to the new one. Desktop navigates from the header.
 */
export const SidebarDock: React.FC = () => {
  const pathname = useLocation({ select: (location) => location.pathname });

  return (
    <nav
      aria-label="Điều hướng chính"
      // its own view-transition layer, so it stays put while pages slide underneath (lib/router.tsx)
      style={{ viewTransitionName: "dock" } as React.CSSProperties}
      className="app-dock lg:hidden pointer-events-none fixed inset-x-0 bottom-[calc(var(--inset-bottom)+0.75rem)] z-50 flex justify-center px-5 select-none"
    >
      <div className="liquid-glass pointer-events-auto relative flex w-full max-w-sm items-center gap-1 rounded-full p-1.5">
        {MOBILE_NAV_LINKS.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href;

          return (
            <Link
              key={href}
              to={href}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
              onClick={() => !isActive && haptic()}
              className={cn(
                "relative flex h-11 flex-1 items-center justify-center rounded-full transition-colors duration-200",
                isActive ? "text-[#1c1300]" : "text-white/85 active:text-white"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="dock-lens"
                  aria-hidden
                  className="liquid-glass-lens absolute inset-0 rounded-full"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <Icon aria-hidden className="relative h-[22px] w-[22px]" strokeWidth={isActive ? 2.25 : 1.75} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
