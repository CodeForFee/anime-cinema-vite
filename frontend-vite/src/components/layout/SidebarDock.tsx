
import React from "react";
import { Link } from "@/lib/router";
import { usePathname } from "@/lib/router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHouse,
  faCompass,
  faMagnifyingGlass,
  faBookmark,
  faClockRotateLeft,
} from "@fortawesome/free-solid-svg-icons";
import { cn } from "../../lib/utils";

const MOBILE_NAV_LINKS = [
  { label: "Trang chủ", href: "/", icon: faHouse },
  { label: "Khám phá", href: "/explore", icon: faCompass },
  { label: "Tìm kiếm", href: "/search", icon: faMagnifyingGlass },
  { label: "Danh sách", href: "/favorites", icon: faBookmark },
  { label: "Lịch sử", href: "/history", icon: faClockRotateLeft },
];

export const SidebarDock: React.FC = () => {
  const pathname = usePathname();

  return (
    <nav className="flex lg:hidden fixed bottom-0 inset-x-0 h-16 bg-[#121212]/95 backdrop-blur-2xl border-t border-white/10 z-50 items-center justify-around px-2 select-none">
      {MOBILE_NAV_LINKS.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full py-1 text-[11px] transition-colors",
              isActive ? "text-primaryRed font-bold" : "text-gray-400 hover:text-white"
            )}
          >
            <FontAwesomeIcon icon={item.icon} className="w-4 h-4 mb-1" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
