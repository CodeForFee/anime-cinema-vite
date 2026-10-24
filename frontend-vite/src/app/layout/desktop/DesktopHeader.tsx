import { Link, useLocation, useSearch } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect } from "react";

import { Brand, HeaderBar } from "@/app/layout/components/Brand";
import { SearchResults } from "@/app/layout/components/SearchResults";
import {
  NAV_LINK,
  NAV_LINK_ACTIVE,
  NavDropdown,
} from "@/app/layout/desktop/NavDropdown";
import { useSearchBox } from "@/app/layout/hooks/use-search-box";
import { useMenuQuery } from "@/core/queries";
import { AccountButton } from "@/features/account";
import { cn } from "@/shared/lib/utils";
import { Input } from "@/shared/ui/input";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/shared/ui/navigation-menu";
import { Skeleton } from "@/shared/ui/skeleton";

/** Desktop: the source site's own menus as hover dropdowns, and a search field with live results (Ctrl+K) */
export function DesktopHeader() {
  const pathname = useLocation({ select: (location) => location.pathname });
  const explorePath = useSearch({
    strict: false,
    select: (search) => search.path,
  });
  const box = useSearchBox();
  // every genre and season the source has shows up here
  const { data: menus = [], isLoading: isMenuLoading } = useMenuQuery();
  // which dropdown entry (if any) is the explore page on screen
  const currentPath = pathname === "/explore" ? (explorePath ?? null) : null;
  const tab = (
    to: "/" | "/schedule" | "/favorites" | "/history",
    label: string,
  ) => (
    <NavigationMenuItem>
      <Link
        to={to}
        className={cn(
          navigationMenuTriggerStyle(),
          NAV_LINK,
          pathname === to && NAV_LINK_ACTIVE,
        )}
      >
        {label}
      </Link>
    </NavigationMenuItem>
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key !== "k") return;
      e.preventDefault();
      box.open();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [box.open]);

  return (
    <HeaderBar>
      <div className="flex items-center gap-8">
        <Brand />
        <NavigationMenu>
          <NavigationMenuList>
            {tab("/", "Trang chủ")}
            {isMenuLoading &&
              [112, 100, 88, 84].map((width) => (
                <NavigationMenuItem key={width}>
                  <Skeleton
                    className="h-9 rounded-full bg-white/10"
                    width={width}
                  />
                </NavigationMenuItem>
              ))}
            {menus.map((menu) => (
              <NavigationMenuItem key={menu.label}>
                <NavDropdown menu={menu} currentPath={currentPath} />
              </NavigationMenuItem>
            ))}
            {tab("/schedule", "Lịch chiếu")}
            {tab("/favorites", "Danh sách của tôi")}
            {tab("/history", "Lịch sử")}
          </NavigationMenuList>
        </NavigationMenu>
      </div>

      <form
        ref={box.formRef}
        onSubmit={box.submit}
        className="flex items-center gap-1"
      >
        <div className="relative w-64 xl:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <Input
            ref={box.inputRef}
            type="text"
            placeholder="Tìm kiếm anime..."
            title="Tìm kiếm (Ctrl+K)"
            value={box.query}
            onChange={(e) => box.type(e.target.value)}
            onFocus={box.focus}
            onKeyDown={(e) => e.key === "Escape" && box.close()}
            className="h-9 rounded-full border-white/20 bg-black/60 pl-9 text-sm text-white focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <SearchResults box={box} />
        </div>
        <div className="ml-3">
          <AccountButton />
        </div>
      </form>
    </HeaderBar>
  );
}
