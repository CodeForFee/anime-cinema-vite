import { BadgeCheck, KeyRound, Mail, Pencil, UserRound } from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";

import type { AccountInfo } from "@/core/source/endpoints/account/parse";
import { FIELD, PRIMARY } from "@/features/account/components/LoginForm";
import { useChangeEmail, useChangePassword, useChangeUsername } from "@/features/account/hooks/use-account";

type Write = { isPending: boolean; error: Error | null; isSuccess: boolean; reset: () => void };

/** One account row; its form opens under it in place of a modal */
function Row({ icon, label, value, action, open, onToggle, write, done, children, onSubmit }: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  action: string;
  open: boolean;
  onToggle: () => void;
  write: Write;
  done: string;
  children: ReactNode;
  onSubmit: (e: FormEvent) => void;
}) {
  return (
    <div className="rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/10">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-gray-400">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
          <div className="mt-0.5 truncate text-sm text-white">{value}</div>
        </div>
        <button type="button" onClick={() => (write.reset(), onToggle())} className="glass-pill flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-gray-100">
          <Pencil aria-hidden className="h-3.5 w-3.5" /> {open ? "Huỷ" : action}
        </button>
      </div>
      {write.isSuccess && !open && <p className="mt-3 text-sm text-emerald-400">{done}</p>}
      {open && (
        <form onSubmit={onSubmit} className="mt-4 space-y-2.5 border-t border-white/10 pt-4">
          {children}
          {write.error && <p role="alert" className="text-xs text-red-400">{write.error.message}</p>}
          <button type="submit" disabled={write.isPending} className={PRIMARY}>
            {write.isPending ? "Đang xử lý..." : action}
          </button>
        </form>
      )}
    </div>
  );
}

/** Tài khoản: email (verified by a link to the current address), username (once in 30 days), password */
export function SettingsTab({ info }: { info: AccountInfo }) {
  const [open, setOpen] = useState<"email" | "username" | "password" | null>(null);
  const toggle = (row: typeof open) => () => setOpen(open === row ? null : row);
  const email = useChangeEmail();
  const username = useChangeUsername();
  const password = useChangePassword();
  const [f, setF] = useState({ email: "", emailPassword: "", username: "", current: "", next: "", confirm: "" });
  const [local, setLocal] = useState("");
  const field = (key: keyof typeof f, props: Record<string, string | number | boolean> = {}) => (
    <input className={FIELD} value={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })} {...props} />
  );
  const setMode = info.passwordMode === "set";
  const after = () => (setOpen(null), setF({ email: "", emailPassword: "", username: "", current: "", next: "", confirm: "" }));

  return (
    <div className="space-y-3">
      <Row
        icon={<Mail className="h-5 w-5" />}
        label="Email"
        value={<span className="flex items-center gap-2">{info.email}{info.emailVerified && <BadgeCheck aria-label="Đã xác minh" className="h-4 w-4 text-emerald-400" />}</span>}
        action="Đổi email"
        open={open === "email"}
        onToggle={toggle("email")}
        write={email}
        done="Đã gửi link xác minh tới email hiện tại."
        onSubmit={(e) => (e.preventDefault(), email.mutate({ email: f.email.trim(), password: f.emailPassword || undefined }, { onSuccess: after }))}
      >
        <p className="text-xs text-gray-400">Link xác nhận sẽ gửi tới email hiện tại trước khi đổi.</p>
        {field("email", { type: "email", required: true, placeholder: "Email mới", "aria-label": "Email mới" })}
        {info.emailNeedsPassword && field("emailPassword", { type: "password", required: true, placeholder: "Mật khẩu", "aria-label": "Mật khẩu" })}
      </Row>

      <Row
        icon={<UserRound className="h-5 w-5" />}
        label="Username"
        value={`@${info.username}`}
        action="Đổi username"
        open={open === "username"}
        onToggle={toggle("username")}
        write={username}
        done="Đã đổi username."
        onSubmit={(e) => (e.preventDefault(), username.mutate(f.username.trim(), { onSuccess: after }))}
      >
        <p className="text-xs text-gray-400">Chỉ đổi được mỗi 30 ngày một lần.</p>
        {field("username", { required: true, pattern: "[A-Za-z0-9_]{3,20}", title: "Chữ, số hoặc _, 3-20 ký tự", placeholder: "Username mới", "aria-label": "Username mới" })}
      </Row>

      <Row
        icon={<KeyRound className="h-5 w-5" />}
        label="Mật khẩu"
        value={<span className="text-gray-300">{info.passwordNote || "••••••••"}</span>}
        action={setMode ? "Đặt mật khẩu" : "Đổi mật khẩu"}
        open={open === "password"}
        onToggle={toggle("password")}
        write={password}
        done="Đã lưu mật khẩu. Giờ có thể đăng nhập trên app bằng email và mật khẩu này."
        onSubmit={(e) => {
          e.preventDefault();
          setLocal("");
          if (f.next.length < 6) return setLocal("Mật khẩu mới phải từ 6 ký tự");
          if (f.next !== f.confirm) return setLocal("Mật khẩu mới và xác nhận không khớp");
          password.mutate({ next: f.next, confirm: f.confirm, current: setMode ? undefined : f.current }, { onSuccess: after });
        }}
      >
        {setMode && <p className="text-xs text-gray-400">Bạn đăng nhập bằng Google: đặt mật khẩu để đăng nhập được bằng email.</p>}
        {!setMode && field("current", { type: "password", required: true, autoComplete: "current-password", placeholder: "Mật khẩu hiện tại", "aria-label": "Mật khẩu hiện tại" })}
        {field("next", { type: "password", required: true, minLength: 6, autoComplete: "new-password", placeholder: "Mật khẩu mới (ít nhất 6 ký tự)", "aria-label": "Mật khẩu mới" })}
        {field("confirm", { type: "password", required: true, autoComplete: "new-password", placeholder: "Nhập lại mật khẩu mới", "aria-label": "Nhập lại mật khẩu mới" })}
        {local && <p role="alert" className="text-xs text-red-400">{local}</p>}
      </Row>
    </div>
  );
}
