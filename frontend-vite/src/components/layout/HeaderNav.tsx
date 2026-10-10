
import React, { useState, useEffect, useRef } from "react";
import { Link } from "@/lib/router";
import { usePathname, useRouter, useSearchParams } from "@/lib/router";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  navigationMenuTriggerStyle,
} from "../lightswind/navigation-menu";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
} from "../lightswind/dropdown-menu";
import { Button } from "../lightswind/button";
import { Input } from "../lightswind/input";
import { Skeleton } from "../lightswind/skeleton";
import { cn } from "../../lib/utils";
import { useMenuQuery, useSearchQuery } from "../../hooks/useAnimeQuery";
import { useDebounce } from "../../hooks/useDebounce";
import { MenuGroup } from "../../lib/api";
import { ChevronDown, Search, X } from "lucide-react";

// Link to the explore page for one of the source site's lists
const exploreLink = (path: string) => `/explore?path=${encodeURIComponent(path)}`;

// Overrides on top of Lightswind's navigationMenuTriggerStyle() to fit the dark Netflix bar
const NAV_LINK =
  "h-9 rounded-full bg-transparent px-3.5 text-gray-300 hover:bg-white/10 hover:text-white focus:bg-transparent focus:text-gray-300 focus-visible:bg-white/10 focus-visible:text-white data-[state=open]:bg-white/10 data-[state=open]:text-white";
const NAV_LINK_ACTIVE = "bg-white/15 text-white font-semibold focus:bg-white/15 focus:text-white";
const MENU_CONTENT = "rounded-xl border-white/10 p-1.5 shadow-2xl";
const MENU_ITEM = "cursor-pointer rounded-lg p-0 text-gray-200";
const MENU_ITEM_LINK = "flex w-full items-center gap-2.5 px-3 py-2";
const ICON_BUTTON =
  "h-9 w-9 rounded-full text-gray-300 transition-colors hover:bg-white/10 hover:text-white [&_svg]:size-5";

const NavDropdown: React.FC<{ menu: MenuGroup; currentPath: string | null }> = ({ menu, currentPath }) => {
  const [open, setOpen] = useState(false);
  const isActive = menu.items.some((item) => item.path === currentPath);
  // Seasons come four to a year, so four columns gives one year per row; other long lists get three
  const columns = menu.items[0]?.path.startsWith("/season/") ? 4 : menu.items.length > 8 ? 3 : 1;

  return (
    <DropdownMenu hoverMode open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        data-state={open ? "open" : "closed"}
        className={cn(navigationMenuTriggerStyle(), NAV_LINK, isActive && NAV_LINK_ACTIVE)}
      >
        {menu.label}
        <ChevronDown
          className="ml-1.5 h-2.5 w-2.5 text-gray-400 transition-transform duration-200 group-data-[state=open]:rotate-180"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className={cn(
          MENU_CONTENT,
          columns === 4 ? "w-[600px]" : columns === 3 ? "w-[480px]" : "min-w-[220px]",
          "max-w-[calc(100vw-2rem)]"
        )}
      >
        <DropdownMenuGroup
          className={cn(
            columns === 1 ? "space-y-0.5" : "grid gap-0.5 space-y-0",
            columns === 4 && "grid-cols-4",
            columns === 3 && "grid-cols-3"
          )}
        >
          {menu.items.map((item) => (
            <DropdownMenuItem
              key={item.path}
              className={cn(MENU_ITEM, item.path === currentPath && "bg-primaryRed/15 text-white")}
            >
              <Link href={exploreLink(item.path)} className={cn(MENU_ITEM_LINK, columns > 1 && "px-2.5 text-[13px]")}>
                <span className="truncate">{item.label}</span>
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const HeaderNav: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const searchBoxRef = useRef<HTMLFormElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  // Results panel under the search box
  const [isResultsOpen, setIsResultsOpen] = useState(false);

  // Live search: results follow what is typed, a moment after the typing stops
  const debouncedQuery = useDebounce(searchQuery.trim(), 350);
  const { data: searchRes, isFetching: isSearching } = useSearchQuery(debouncedQuery);
  const searchResults = searchRes?.items || [];
  const isWaiting = isSearching || debouncedQuery !== searchQuery.trim();
  const showResults = isResultsOpen && searchQuery.trim().length > 0;

  useEffect(() => {
    const phone = window.matchMedia("(max-width: 767.98px)").matches;
    document.documentElement.toggleAttribute("data-search", isSearchOpen && phone);
    return () => document.documentElement.removeAttribute("data-search");
  }, [isSearchOpen]);

  const closeSearch = () => {
    setIsResultsOpen(false);
    setIsSearchOpen(false);
    searchInputRef.current?.blur();
  };

  // Handle hotkey Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
        // Focus after the box is shown (it is hidden on small screens until opened)
        setTimeout(() => searchInputRef.current?.focus(), 0);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close the results when clicking anywhere else, and whenever the page changes
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) setIsResultsOpen(false);
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  useEffect(() => {
    setIsResultsOpen(false);
    setIsSearchOpen(false);
  }, [pathname, searchParams]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      closeSearch();
    }
  };

  // Dropdowns are the source site's own menu, so every genre and season it has shows up here
  const { data: menus = [], isLoading: isMenuLoading } = useMenuQuery();
  // Which dropdown entry (if any) matches the explore page currently shown
  const currentPath = pathname === "/explore" ? searchParams.get("path") : null;

  return (
    <header className="sticky top-0 z-50 flex h-[calc(4rem+var(--inset-top))] w-full items-center justify-between gap-4 border-b border-white/10 bg-[#141414] px-4 pt-[var(--inset-top)] md:px-12">
      {/* Left Branding & Navigation */}
      <div className="flex items-center gap-4 md:gap-8">
        {/* Brand */}
        <Link href="/" aria-label="Capynime - Trang chủ" className="flex items-center gap-2">
          <img src="/app-icon.png" alt="" width={36} height={36} className="h-8 w-8 md:h-9 md:w-9 rounded-xl shadow-lg shadow-red-900/40" />
          <span className="font-display text-xl md:text-2xl font-extrabold tracking-tight text-white">
            Capy<span className="text-primaryRed">nime</span>
          </span>
        </Link>

        {/* Desktop Navigation (Lightswind NavigationMenu + DropdownMenu) */}
        <NavigationMenu className="hidden lg:flex">
          <NavigationMenuList>
            <NavigationMenuItem>
              <Link
                href="/"
                className={cn(navigationMenuTriggerStyle(), NAV_LINK, pathname === "/" && NAV_LINK_ACTIVE)}
              >
                Trang chủ
              </Link>
            </NavigationMenuItem>

            {isMenuLoading &&
              [112, 100, 88, 84].map((width) => (
                <NavigationMenuItem key={width}>
                  <Skeleton className="h-9 rounded-full bg-white/10" width={width} />
                </NavigationMenuItem>
              ))}

            {menus.map((menu) => (
              <NavigationMenuItem key={menu.label}>
                <NavDropdown menu={menu} currentPath={currentPath} />
              </NavigationMenuItem>
            ))}

            <NavigationMenuItem>
              <Link
                href="/favorites"
                className={cn(navigationMenuTriggerStyle(), NAV_LINK, pathname === "/favorites" && NAV_LINK_ACTIVE)}
              >
                Danh sách của tôi
              </Link>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <Link
                href="/history"
                className={cn(navigationMenuTriggerStyle(), NAV_LINK, pathname === "/history" && NAV_LINK_ACTIVE)}
              >
                Lịch sử
              </Link>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>

      {/* Right Quick Actions */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Search: always shown from md up. Phones: the icon opens it as a spotlight popup near the top
            of the screen over a dimmed page; tapping the dimmed part closes it */}
        <form
          ref={searchBoxRef}
          onSubmit={handleSearchSubmit}
          onClick={(e) => isSearchOpen && e.target === e.currentTarget && closeSearch()}
          className={cn(
            "items-center gap-1",
            isSearchOpen
              ? "cn-fade fixed inset-0 z-[200] flex items-start gap-2 bg-black/60 px-4 pt-[calc(var(--inset-top)+6vh)] backdrop-blur-sm md:static md:z-auto md:items-center md:gap-1 md:bg-transparent md:p-0 md:backdrop-blur-none md:[animation:none]"
              : "hidden md:flex"
          )}
        >
          <div className={cn("relative w-full md:w-64 xl:w-80", isSearchOpen && "cn-pop max-md:flex-1")}>
            <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Tìm kiếm anime..."
              title="Tìm kiếm (Ctrl+K)"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsResultsOpen(true);
              }}
              onFocus={() => setIsResultsOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Escape") closeSearch();
              }}
              className={cn(
                "h-9 rounded-full border-white/20 bg-black/60 pl-9 text-sm text-white focus-visible:ring-0 focus-visible:ring-offset-0",
                // phones: a large glass field in the popup
                "search-field"
              )}
            />

            {/* Live results */}
            {showResults && (
              <div className="absolute right-0 top-full z-50 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-[#181818] shadow-2xl search-results cn-pop max-md:left-0 max-md:right-[-3.5rem] max-md:w-auto md:w-[400px]">
                {searchResults.length > 0 ? (
                  <>
                    <ul className="max-h-[60vh] overflow-y-auto overscroll-contain p-1.5 max-md:max-h-[calc(100dvh-var(--inset-top)-6vh-9rem)] max-md:p-2">
                      {searchResults.slice(0, 8).map((item) => (
                        <li key={item.slug}>
                          <Link
                            href={`/watch?slug=${encodeURIComponent(item.slug)}`}
                            onClick={closeSearch}
                            className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-white/10 max-md:gap-4 max-md:rounded-2xl max-md:p-2.5 active:bg-white/10"
                          >
                            <img
                              src={item.poster || item.image || ""}
                              alt=""
                              loading="lazy"
                              className="h-14 w-10 flex-shrink-0 rounded bg-white/10 object-cover max-md:h-24 max-md:w-16 max-md:rounded-xl"
                            />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-white max-md:line-clamp-2 max-md:whitespace-normal max-md:text-base max-md:leading-snug">{item.title}</span>
                              {(item.latestEpisode || item.episode) && (
                                <span className="block truncate text-xs text-gray-400 max-md:mt-1 max-md:text-sm">
                                  {item.latestEpisode || item.episode}
                                </span>
                              )}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={`/search?q=${encodeURIComponent(searchQuery.trim())}`}
                      onClick={closeSearch}
                      className="block border-t border-white/10 px-4 py-2.5 text-center text-sm font-semibold text-gray-200 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      Xem tất cả {searchResults.length} kết quả
                    </Link>
                  </>
                ) : isWaiting ? (
                  <div className="space-y-1.5 p-1.5">
                    {[0, 1, 2].map((row) => (
                      <div key={row} className="flex items-center gap-3 p-2">
                        <Skeleton className="h-14 w-10 flex-shrink-0 rounded bg-white/10" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-3.5 w-3/4 bg-white/10" />
                          <Skeleton className="h-3 w-1/3 bg-white/10" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="px-4 py-6 text-center text-sm text-gray-400">
                    Không tìm thấy anime nào cho &ldquo;{searchQuery.trim()}&rdquo;.
                  </p>
                )}
              </div>
            )}
          </div>
          <Button
            type="button"
            variant="unstyled"
            size="unstyled"
            aria-label="Đóng tìm kiếm"
            onClick={closeSearch}
            className={cn(ICON_BUTTON, "glass-button h-12 w-12 flex-shrink-0 rounded-2xl md:hidden")}
          >
            <X className="w-5 h-5" />
          </Button>
        </form>

        <Button
          variant="unstyled"
          size="unstyled"
          aria-label="Tìm kiếm"
          onClick={() => {
            setIsSearchOpen(true);
            setTimeout(() => searchInputRef.current?.focus(), 0);
          }}
          className={cn(ICON_BUTTON, "md:hidden")}
        >
          <Search className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
};
