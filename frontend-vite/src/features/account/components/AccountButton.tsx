import { Link } from "@tanstack/react-router";
import { Bell, Bookmark, History, LogIn, LogOut, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";

import { LoginForm, PRIMARY } from "@/features/account/components/LoginForm";
import { useNotifications } from "@/features/account/hooks/use-account";
import { syncSourceUser, useLoginDialog, useSourceUser } from "@/features/account/store";
import { cn } from "@/shared/lib/utils";
import { Dialog } from "@/shared/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

/** The sign-in dialog, opened from the header or a comment box */
function LoginDialog() {
  const { open, setOpen } = useLoginDialog();
  const close = () => setOpen(false);
  return (
    <Dialog open={open} onClose={close} className="glass-sheet max-w-md rounded-3xl border-white/10 p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-white">Đăng nhập</h2>
          <p className="mt-1 text-sm text-gray-400">Dùng tài khoản AnimeVietsub để bình luận và đồng bộ.</p>
        </div>
        <button type="button" aria-label="Đóng" onClick={close} className="glass-pill flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-200">
          <X className="h-4 w-4" />
        </button>
      </div>
      <LoginForm onCancel={close} />
    </Dialog>
  );
}

const ITEM = "cursor-pointer rounded-lg p-0 text-gray-200";
const ROW = "flex w-full items-center gap-2.5 px-3 py-2.5 text-sm";

/** Header: "Đăng nhập" when signed out; the avatar and the account menu (like the source's) when signed in */
export function AccountButton({ compact = false }: { compact?: boolean }) {
  const { user, logout } = useSourceUser();
  const { setOpen } = useLoginDialog();
  const [menu, setMenu] = useState(false);
  // after first paint, so the check never delays the page itself
  useEffect(() => {
    const id = setTimeout(() => void syncSourceUser(), 1500);
    return () => clearTimeout(id);
  }, []);
  const { unread } = useNotifications();

  if (!user)
    return (
      <>
        {compact ? (
          <button
            type="button"
            aria-label="Đăng nhập"
            onClick={() => setOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <UserRound className="h-5 w-5" />
          </button>
        ) : (
          <button type="button" onClick={() => setOpen(true)} className={cn(PRIMARY, "h-9 px-4")}>
            <LogIn aria-hidden className="h-4 w-4" />
            Đăng nhập
          </button>
        )}
        <LoginDialog />
      </>
    );

  return (
    <>
      <DropdownMenu open={menu} onOpenChange={setMenu}>
        <DropdownMenuTrigger
          aria-label={unread > 0 ? `Tài khoản, ${unread} thông báo mới` : "Tài khoản"}
          className="relative rounded-full ring-2 ring-white/20 transition hover:ring-white/50"
        >
          <img src={user.avatar} alt="" className="h-9 w-9 rounded-full bg-white/10 object-cover" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-primaryRed px-1 text-center text-[10px] font-bold leading-[18px] text-white ring-2 ring-background">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="w-60 rounded-xl border-white/10 p-1.5 shadow-2xl">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <img src={user.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
            <p className="min-w-0 truncate font-semibold text-white">{user.name}</p>
          </div>
          <div className="my-1 h-px bg-white/10" />
          <DropdownMenuGroup className="space-y-0.5">
            <DropdownMenuItem className={ITEM} onClick={() => setMenu(false)}>
              <Link to="/account" className={ROW}>
                <UserRound aria-hidden className="h-4 w-4 text-gray-400" /> Thông tin tài khoản
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className={ITEM} onClick={() => setMenu(false)}>
              <Link to="/account" search={{ tab: "thongbao" }} className={ROW}>
                <Bell aria-hidden className="h-4 w-4 text-gray-400" /> Thông báo
                {unread > 0 && <span className="ml-auto rounded-full bg-primaryRed px-1.5 text-[11px] text-white">{unread}</span>}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className={ITEM} onClick={() => setMenu(false)}>
              <Link to="/favorites" className={ROW}>
                <Bookmark aria-hidden className="h-4 w-4 text-gray-400" /> Hộp phim
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className={ITEM} onClick={() => setMenu(false)}>
              <Link to="/history" className={ROW}>
                <History aria-hidden className="h-4 w-4 text-gray-400" /> Lịch sử
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className={ITEM} onClick={() => (setMenu(false), logout.mutate())}>
              <span className={cn(ROW, "text-red-400")}>
                <LogOut aria-hidden className="h-4 w-4" /> Thoát
              </span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <LoginDialog />
    </>
  );
}
