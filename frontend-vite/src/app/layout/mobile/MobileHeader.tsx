import { Search, X } from "lucide-react";
import { useEffect } from "react";

import { Brand, HeaderBar } from "@/app/layout/components/Brand";
import { SearchResults } from "@/app/layout/components/SearchResults";
import { useSearchBox } from "@/app/layout/hooks/use-search-box";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

const ICON_BUTTON =
  "h-9 w-9 rounded-full text-gray-300 transition-colors hover:bg-white/10 hover:text-white [&_svg]:size-5";

/**
 * Mobile: the name and a search icon. The icon opens search as a spotlight popup near the top of the screen over
 * a dimmed page (a dense tint, no blur to redo while results scroll); tapping the dimmed part closes it.
 */
export function MobileHeader() {
  const box = useSearchBox();

  // while the popup is open the tab bar hides and the page stops scrolling (globals.css html[data-search])
  useEffect(() => {
    document.documentElement.toggleAttribute("data-search", box.isOpen);
    return () => document.documentElement.removeAttribute("data-search");
  }, [box.isOpen]);

  return (
    <HeaderBar>
      <Brand />
      {box.isOpen && (
        <form
          ref={box.formRef}
          onSubmit={box.submit}
          onClick={(e) => e.target === e.currentTarget && box.close()}
          className="search-popup cn-fade fixed inset-0 z-[200] flex items-start gap-2 bg-black/80 px-4 pt-[calc(var(--inset-top)+6vh)]"
        >
          <div className="cn-pop relative w-full flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <Input
              ref={box.inputRef}
              type="text"
              placeholder="Tìm kiếm anime..."
              value={box.query}
              onChange={(e) => box.type(e.target.value)}
              onFocus={box.focus}
              onKeyDown={(e) => e.key === "Escape" && box.close()}
              className="search-field h-9 rounded-full border-white/20 bg-black/60 pl-9 text-sm text-white focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <SearchResults box={box} large />
          </div>
          <Button
            type="button"
            variant="unstyled"
            size="unstyled"
            aria-label="Đóng tìm kiếm"
            onClick={box.close}
            className={`${ICON_BUTTON} glass-button h-12 w-12 flex-shrink-0 rounded-2xl`}
          >
            <X className="w-5 h-5" />
          </Button>
        </form>
      )}
      <Button
        variant="unstyled"
        size="unstyled"
        aria-label="Tìm kiếm"
        onClick={box.open}
        className={ICON_BUTTON}
      >
        <Search className="w-4 h-4" />
      </Button>
    </HeaderBar>
  );
}
