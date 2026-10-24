import { useMutation } from "@tanstack/react-query";
import { LogIn, UserRoundPlus } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";

import { C_URL } from "@/core/source/hosts";
import { syncSourceUser, useSourceUser } from "@/features/account/store";
import { isNativeApp } from "@/platform/transport";

export const FIELD =
  "glass-field w-full rounded-2xl px-4 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none transition focus:ring-2 focus:ring-white/30";
export const PRIMARY =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-black shadow-lg transition hover:bg-white/90 active:scale-95 disabled:opacity-50";

type SourceFlow = "google" | "register";

function sourceAccountUrl(path: "login" | "register") {
  const url = new URL(`/account/${path}/`, C_URL);
  url.searchParams.set("_fxRef", window.location.origin);
  return url.toString();
}

/** Sign in with AnimeVietsub credentials or open its official registration page on web. */
export function LoginForm({ onCancel }: { onCancel?: () => void }) {
  const { login } = useSourceUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sourceFlow, setSourceFlow] = useState<SourceFlow | null>(null);
  const [flowMessage, setFlowMessage] = useState("");
  const popup = useRef<Window | null>(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    if (!sourceFlow) return;
    let active = true;
    let checking = false;

    const checkSession = async () => {
      if (checking) return;
      checking = true;
      try {
        const user = await syncSourceUser(true);
        if (active && user) {
          popup.current?.close();
          popup.current = null;
          setSourceFlow(null);
          setFlowMessage("");
          onCancelRef.current?.();
        } else if (active && popup.current?.closed) {
          setSourceFlow(null);
          setFlowMessage("Chưa xác nhận được phiên. Hãy kiểm tra đăng nhập rồi thử lại.");
        }
      } catch {
        // The source request may fail while AVS Helper is unavailable; that is not a sign-out.
        if (active && popup.current?.closed) {
          setSourceFlow(null);
          setFlowMessage("Chưa xác nhận được phiên. Hãy kiểm tra đăng nhập rồi thử lại.");
        }
      } finally {
        checking = false;
      }
    };

    const interval = window.setInterval(() => void checkSession(), 2000);
    return () => {
      active = false;
      window.clearInterval(interval);
      popup.current?.close();
      popup.current = null;
    };
  }, [sourceFlow]);

  const openSourcePage = (flow: SourceFlow) => {
    const url = sourceAccountUrl(flow === "google" ? "login" : "register");
    const opened = window.open(
      url,
      "capynime-source-account",
      "popup=yes,width=520,height=720,resizable=yes,scrollbars=yes",
    );
    if (!opened) {
      setFlowMessage("Trình duyệt đã chặn cửa sổ đăng nhập. Hãy cho phép popup rồi thử lại.");
      return;
    }
    popup.current = opened;
    opened.focus();
    setFlowMessage(
      flow === "google"
        ? "Chọn tài khoản trong cửa sổ Google; Capynime sẽ tự đóng popup sau khi AnimeVietsub xác nhận phiên."
        : "Hoàn tất đăng ký ở cửa sổ AnimeVietsub; Capynime sẽ tự nhận phiên nếu nguồn đăng nhập tài khoản.",
    );
    setSourceFlow(flow);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (email.trim() && password) login.mutate({ email, password });
  };

  return (
    <div className="space-y-4">
      {!isNativeApp && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => openSourcePage("google")}
            disabled={Boolean(sourceFlow)}
            className="glass-pill flex h-11 w-full items-center justify-center gap-2 rounded-full border border-white/15 px-4 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
          >
            <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5">
              <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z" />
              <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z" />
              <path fill="#FBBC05" d="M12.6 27.6a12 12 0 0 1 0-7.2v-5.3H5.8a20 20 0 0 0 0 17.8l6.8-5.3Z" />
              <path fill="#EA4335" d="M24 12c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 6 29.5 4 24 4A20 20 0 0 0 5.8 15.1l6.8 5.3C14.2 15.6 18.7 12 24 12Z" />
            </svg>
            Đăng nhập với Google
          </button>
          <button
            type="button"
            onClick={() => openSourcePage("register")}
            disabled={Boolean(sourceFlow)}
            className="glass-pill flex h-10 w-full items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold text-gray-200 transition hover:bg-white/10 disabled:opacity-50"
          >
            <UserRoundPlus aria-hidden className="h-4 w-4" />
            Tạo tài khoản AnimeVietsub
          </button>
          {flowMessage && (
            <p role="status" className="text-center text-xs leading-relaxed text-gray-400">
              {flowMessage}
            </p>
          )}
        </div>
      )}

      <form onSubmit={submit} className="space-y-3">
        <input
          className={FIELD}
          autoComplete="username"
          required
          disabled={login.isPending}
          placeholder="Email hoặc tên đăng nhập"
          aria-label="Email hoặc tên đăng nhập"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className={FIELD}
          type="password"
          required
          disabled={login.isPending}
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
            <button type="button" disabled={login.isPending} onClick={onCancel} className="glass-pill h-10 rounded-full px-4 text-sm font-semibold text-gray-200">
              Huỷ
            </button>
          )}
          <button type="submit" disabled={login.isPending} className={PRIMARY}>
            <LogIn aria-hidden className="h-4 w-4" />
            {login.isPending ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </div>
        {isNativeApp && (
          <p className="text-xs leading-relaxed text-gray-500">
            APK hiện đăng nhập bằng email hoặc tên đăng nhập và mật khẩu AnimeVietsub. Nguồn chưa cung cấp luồng Google chuyển phiên vào ứng dụng; Chrome và APK dùng kho phiên riêng.
          </p>
        )}
      </form>
    </div>
  );
}
