import { LogIn } from "lucide-react";
import { type FormEvent, useState } from "react";

import { useSourceUser } from "@/features/account/store";

export const FIELD =
  "glass-field w-full rounded-2xl px-4 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none transition focus:ring-2 focus:ring-white/30";
export const PRIMARY =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-black shadow-lg transition hover:bg-white/90 active:scale-95 disabled:opacity-50";

/** Sign in with an AnimeVietsub account; only md5(password) leaves the device, like the source's own form */
export function LoginForm({ onCancel }: { onCancel?: () => void }) {
  const { login } = useSourceUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (email.trim() && password) login.mutate({ email, password });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <input
        className={FIELD}
        autoComplete="username"
        placeholder="Email hoặc tên đăng nhập"
        aria-label="Email hoặc tên đăng nhập"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className={FIELD}
        type="password"
        autoComplete="current-password"
        placeholder="Mật khẩu"
        aria-label="Mật khẩu"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {login.error && (
        <p role="alert" className="text-xs text-red-400">
          {login.error.message}
        </p>
      )}
      <div className="flex justify-end gap-2 pt-1">
        {onCancel && (
          <button type="button" onClick={onCancel} className="glass-pill h-10 rounded-full px-4 text-sm font-semibold text-gray-200">
            Huỷ
          </button>
        )}
        <button type="submit" disabled={login.isPending} className={PRIMARY}>
          <LogIn aria-hidden className="h-4 w-4" />
          {login.isPending ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </div>
      <p className="text-xs leading-relaxed text-gray-500">
        Đã đăng nhập AnimeVietsub (kể cả bằng Google) trên trình duyệt này? App tự nhận, không cần nhập lại. Tải lại
        trang nếu chưa thấy.
      </p>
    </form>
  );
}
