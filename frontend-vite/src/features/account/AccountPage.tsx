import { useNavigate, useSearch } from "@tanstack/react-router";
import { Bell, CalendarDays, ExternalLink, LogIn, LogOut, MessagesSquare, ShieldCheck, UserRound } from "lucide-react";

import { MyCommentsTab, NotificationsTab } from "@/features/account/components/ActivityTabs";
import { PRIMARY } from "@/features/account/components/LoginForm";
import { ProfileTab } from "@/features/account/components/ProfileTab";
import { SettingsTab } from "@/features/account/components/SettingsTab";
import { useAccountInfo, useNotifications } from "@/features/account/hooks/use-account";
import { useLoginDialog, useSourceUser } from "@/features/account/store";
import { AmbientBackdrop } from "@/shared/ui/AmbientBackdrop";
import { Skeleton } from "@/shared/ui/skeleton";

export const ACCOUNT_TABS = ["hoso", "taikhoan", "binhluan", "thongbao"] as const;
export type AccountTab = (typeof ACCOUNT_TABS)[number];
const TABS: [AccountTab, string, typeof UserRound][] = [
  ["hoso", "Hồ sơ", UserRound],
  ["taikhoan", "Tài khoản", ShieldCheck],
  ["binhluan", "Bình luận", MessagesSquare],
  ["thongbao", "Thông báo", Bell],
];

function SignedOut() {
  const { setOpen } = useLoginDialog();
  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-16 text-center">
      <h1 className="font-display text-2xl font-bold text-white">Chưa đăng nhập</h1>
      <p className="text-sm text-gray-400">Đăng nhập tài khoản AnimeVietsub để xem và sửa hồ sơ, bình luận, thông báo.</p>
      <button type="button" onClick={() => setOpen(true)} className={PRIMARY}>
        <LogIn aria-hidden className="h-4 w-4" /> Đăng nhập
      </button>
    </div>
  );
}

/** /account?tab=: the viewer's AnimeVietsub account, the same four tabs as the source's own page */
export default function AccountPage() {
  const { user, logout } = useSourceUser();
  const { tab = "hoso" } = useSearch({ from: "/account" });
  const navigate = useNavigate();
  const info = useAccountInfo();
  const { unread } = useNotifications();
  const a = info.data;

  if (!user || info.data === null) return <SignedOut />;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 pt-4 pb-6 md:px-8 md:py-10">
      <AmbientBackdrop src={a?.avatar ?? user.avatar} />

      <section className="glass-card relative overflow-hidden rounded-3xl p-5 md:p-7">
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-primaryRed/45 via-primaryRed/10 to-transparent" />
        <div className="relative flex items-center gap-4 md:gap-6">
          <img src={a?.avatar ?? user.avatar} alt="" className="h-20 w-20 shrink-0 rounded-full object-cover ring-4 ring-white/80 md:h-24 md:w-24" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-2xl font-bold tracking-tight text-white md:text-3xl">{a?.name ?? user.name}</h1>
            {a ? (
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-300">
                <span>{a.handle}</span>
                <span className="flex items-center gap-1 text-gray-400">
                  <CalendarDays aria-hidden className="h-3.5 w-3.5" /> {a.joined}
                </span>
              </p>
            ) : (
              <Skeleton className="mt-2 h-4 w-40 bg-white/10" />
            )}
          </div>
          <div className="hidden shrink-0 flex-col gap-2 sm:flex">
            {a?.publicUrl && (
              <a href={a.publicUrl} target="_blank" rel="noreferrer" className="glass-pill flex h-9 items-center gap-2 rounded-full px-4 text-sm font-semibold text-gray-100">
                <ExternalLink aria-hidden className="h-4 w-4" /> Trang công khai
              </a>
            )}
            <button type="button" onClick={() => logout.mutate()} className="glass-pill flex h-9 items-center gap-2 rounded-full px-4 text-sm font-semibold text-red-300">
              <LogOut aria-hidden className="h-4 w-4" /> Đăng xuất
            </button>
          </div>
        </div>
      </section>

      <div role="tablist" aria-label="Tài khoản" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
        {TABS.map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => navigate({ to: "/account", search: { tab: id }, replace: true })}
            className={`flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition active:scale-95 ${
              tab === id ? "bg-white text-black shadow-lg" : "glass-pill text-gray-200 hover:text-white"
            }`}
          >
            <Icon aria-hidden className="h-4 w-4" />
            {label}
            {id === "thongbao" && unread > 0 && (
              <span className="rounded-full bg-primaryRed px-1.5 text-[11px] leading-5 text-white">{unread}</span>
            )}
          </button>
        ))}
      </div>

      <section className="glass-card rounded-3xl p-5 md:p-8">
        {(tab === "hoso" || tab === "taikhoan") && !a ? (
          info.error ? (
            <p className="text-sm text-gray-400">Chưa tải được tài khoản: {info.error.message}</p>
          ) : (
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} variant="rounded" className="h-14 rounded-2xl bg-white/10" />
              ))}
            </div>
          )
        ) : tab === "hoso" && a ? (
          <ProfileTab key={info.dataUpdatedAt} info={a} />
        ) : tab === "taikhoan" && a ? (
          <SettingsTab info={a} />
        ) : tab === "binhluan" ? (
          <MyCommentsTab />
        ) : (
          <NotificationsTab />
        )}
      </section>

      <button type="button" onClick={() => logout.mutate()} className="glass-pill flex h-10 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold text-red-300 sm:hidden">
        <LogOut aria-hidden className="h-4 w-4" /> Đăng xuất
      </button>
    </div>
  );
}
