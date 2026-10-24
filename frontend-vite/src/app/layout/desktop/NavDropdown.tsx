import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

import type { MenuGroup } from "@/core/anime-api";
import { cn } from "@/shared/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { navigationMenuTriggerStyle } from "@/shared/ui/navigation-menu";

// Overrides on top of navigationMenuTriggerStyle() to fit the dark Netflix bar
export const NAV_LINK =
  "h-9 rounded-full bg-transparent px-3.5 text-gray-300 hover:bg-white/10 hover:text-white focus:bg-transparent focus:text-gray-300 focus-visible:bg-white/10 focus-visible:text-white data-[state=open]:bg-white/10 data-[state=open]:text-white";
export const NAV_LINK_ACTIVE =
  "bg-white/15 text-white font-semibold focus:bg-white/15 focus:text-white";

/** One menu of the source site (types, rankings, genres, seasons) opening on hover */
export function NavDropdown({
  menu,
  currentPath,
}: {
  menu: MenuGroup;
  currentPath: string | null;
}) {
  const [open, setOpen] = useState(false);
  const isActive = menu.items.some((item) => item.path === currentPath);
  // seasons come four to a year, so four columns gives one year per row; other long lists get three
  const columns = menu.items[0]?.path.startsWith("/season/")
    ? 4
    : menu.items.length > 8
      ? 3
      : 1;

  return (
    <DropdownMenu hoverMode open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        data-state={open ? "open" : "closed"}
        className={cn(
          navigationMenuTriggerStyle(),
          NAV_LINK,
          isActive && NAV_LINK_ACTIVE,
        )}
      >
        {menu.label}
        <ChevronDown className="ml-1.5 h-2.5 w-2.5 text-gray-400 transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className={cn(
          "rounded-xl border-white/10 p-1.5 shadow-2xl",
          columns === 4
            ? "w-[600px]"
            : columns === 3
              ? "w-[480px]"
              : "min-w-[220px]",
          "max-w-[calc(100vw-2rem)]",
        )}
      >
        <DropdownMenuGroup
          className={cn(
            columns === 1 ? "space-y-0.5" : "grid gap-0.5 space-y-0",
            columns === 4 && "grid-cols-4",
            columns === 3 && "grid-cols-3",
          )}
        >
          {menu.items.map((item) => (
            <DropdownMenuItem
              key={item.path}
              className={cn(
                "cursor-pointer rounded-lg p-0 text-gray-200",
                item.path === currentPath && "bg-primaryRed/15 text-white",
              )}
            >
              <Link
                to="/explore"
                search={{ path: item.path }}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2",
                  columns > 1 && "px-2.5 text-[13px]",
                )}
              >
                <span className="truncate">{item.label}</span>
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
