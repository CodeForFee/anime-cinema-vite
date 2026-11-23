import { transport } from "@/platform/transport";
import { Download, Puzzle, X } from "lucide-react";
import { useState } from "react";

/** Older builds lose the source Referer when Chrome restarts them and hand any site's cookies to the page */
export const MIN_EXTENSION_VERSION = "1.0.47";
// published by .github/workflows/extension-release.yml
const DOWNLOAD_URL =
  "https://github.com/CodeForFee/anime-cinema-vite/releases?q=ext-v&expanded=true";

/** true when `version` (x.y.z) is older than `min`; anything unparsable counts as current */
export function isOutdated(version: string, min = MIN_EXTENSION_VERSION) {
  const parse = (value: string) => value.split(".").map(Number);
  const have = parse(version);
  const need = parse(min);
  if (have.some(Number.isNaN)) return false;
  for (let i = 0; i < need.length; i++) {
    const diff = (have[i] ?? 0) - need[i];
    if (diff !== 0) return diff < 0;
  }
  return false;
}

function UpdateBanner({ version }: { version: string }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-3 bg-amber-500/15 px-4 py-2 text-sm text-amber-200"
    >
      <span>
        Extension AVS Helper {version} đã cũ, hãy cập nhật lên{" "}
        {MIN_EXTENSION_VERSION} để phát ổn định và an toàn hơn.
      </span>
      <a
        href={DOWNLOAD_URL}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 font-semibold underline underline-offset-2"
      >
        <Download aria-hidden className="h-4 w-4" />
        Tải bản mới
      </a>
      <button
        type="button"
        onClick={() => setOpen(false)}
        aria-label="Ẩn thông báo cập nhật"
        className="rounded p-1 hover:bg-white/10"
      >
        <X aria-hidden className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * Every request of this app goes through the AVS Helper extension (see src/core/source/transport.ts).
 * The extension stamps data-http-version on <html> at document_start; without it nothing can load, and an old
 * one still works but gets a banner. Inside the Android app the native transport stands in for it ("native"),
 * so this gate is always open there.
 */
export function ExtensionGate({ children }: { children: React.ReactNode }) {
  const version = transport.version;
  if (version)
    return (
      <>
        {version !== "native" && isOutdated(version) && (
          <UpdateBanner version={version} />
        )}
        {children}
      </>
    );

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-5 px-6 text-center">
      <Puzzle className="h-16 w-16 text-primaryRed" aria-hidden />
      <h1 className="text-2xl font-bold text-white">
        Cần cài extension AVS Helper
      </h1>
      <p className="text-sm leading-relaxed text-gray-400">
        Trang này lấy dữ liệu và phát video trực tiếp từ trình duyệt của bạn
        thông qua extension AVS Helper. Chưa có extension thì trang không thể
        tải phim. Cần Chrome hoặc Edge 116 trở lên.
      </p>
      <a
        href={DOWNLOAD_URL}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-10 items-center gap-2 rounded-full bg-white/10 px-5 text-sm font-semibold text-white hover:bg-white/20"
      >
        <Download aria-hidden className="h-4 w-4" />
        Tải extension (.zip)
      </a>
      <ol className="space-y-2 text-left text-sm text-gray-300">
        <li>1. Giải nén file vừa tải.</li>
        <li>
          2. Mở{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5">
            chrome://extensions
          </code>{" "}
          và bật Developer mode.
        </li>
        <li>
          3. Bấm “Load unpacked”, chọn thư mục vừa giải nén (hoặc{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5">
            avs-helper-extension/manifest-v3/extension
          </code>{" "}
          nếu bạn tự build).
        </li>
        <li>4. Tải lại trang này.</li>
      </ol>
      <button
        type="button"
        onClick={() => location.reload()}
        className="h-10 rounded-full bg-primaryRed px-6 text-sm font-semibold text-white hover:bg-red-600"
      >
        Tôi đã cài, tải lại
      </button>
    </main>
  );
}
