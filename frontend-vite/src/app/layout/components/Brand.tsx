import { Link } from "@tanstack/react-router";
import type React from "react";

/** Icon and name, linking home */
export function Brand() {
  return (
    <Link
      to="/"
      aria-label="Capynime - Trang chủ"
      className="flex items-center gap-2"
    >
      <img
        src="/app-icon.png"
        alt=""
        width={36}
        height={36}
        className="h-8 w-8 md:h-9 md:w-9 rounded-xl shadow-lg shadow-red-900/40"
      />
      <span className="font-display text-xl md:text-2xl font-extrabold tracking-tight text-white">
        Capy<span className="text-primaryRed">nime</span>
      </span>
    </Link>
  );
}

/** The bar itself: sticky, under the status bar; its own view-transition layer, so it stays put while pages slide */
export function HeaderBar({ children }: { children: React.ReactNode }) {
  return (
    <header
      style={{ viewTransitionName: "header" } as React.CSSProperties}
      className="sticky top-0 z-50 flex h-[calc(4rem+var(--inset-top))] w-full items-center justify-between gap-4 border-b border-white/10 bg-[#141414] px-4 pt-[var(--inset-top)] md:px-12"
    >
      {children}
    </header>
  );
}
