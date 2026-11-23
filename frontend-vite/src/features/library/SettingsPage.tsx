import { Download, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { useProgressStore } from "@/core/player/progress";
import { makeBackup, mergeBackup, parseBackup } from "@/core/stores/backup";
import { useHistoryStore } from "@/core/stores/history";
import { PlaybackToggles } from "@/features/player";

// a backup of 300 titles and 500 positions is well under 1 MB
const MAX_FILE_BYTES = 5 * 1024 * 1024;

function download() {
  const backup = makeBackup();
  const link = document.createElement("a");
  link.href = URL.createObjectURL(
    new Blob([JSON.stringify(backup)], { type: "application/json" }),
  );
  link.download = `capynime-${backup.exportedAt.slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

/** Playback choices, and moving history / favorites / positions to another device with a file */
export default function SettingsPage() {
  const history = useHistoryStore((s) => s.history.length);
  const favorites = useHistoryStore((s) => s.favorites.length);
  const positions = useProgressStore((s) => Object.keys(s.entries).length);
  const input = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  const restore = async (file: File | undefined) => {
    if (!file) return;
    try {
      if (file.size > MAX_FILE_BYTES)
        throw new Error("File quá lớn (tối đa 5 MB)");
      const added = mergeBackup(parseBackup(await file.text()));
      setResult({
        ok: true,
        text: `Đã gộp ${added.history} phim đang xem, ${added.favorites} phim đã lưu và ${added.progress} vị trí xem.`,
      });
    } catch (error) {
      setResult({ ok: false, text: (error as Error).message });
    } finally {
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 pt-4 pb-10 md:px-8 md:py-10">
      <h1 className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl">
        Cài đặt
      </h1>

      <section className="glass-card space-y-2 rounded-3xl p-4">
        <h2 className="px-1 text-sm font-semibold text-gray-400">Phát video</h2>
        <PlaybackToggles />
      </section>

      <section className="glass-card space-y-4 rounded-3xl p-5">
        <div>
          <h2 className="text-sm font-semibold text-gray-400">
            Sao lưu dữ liệu
          </h2>
          <p className="mt-1 text-sm text-gray-300">
            Lịch sử ({history}), phim đã lưu ({favorites}) và vị trí đang xem (
            {positions}) chỉ nằm trên thiết bị này. Tải file về rồi khôi phục ở
            máy khác; dữ liệu được gộp, không bị ghi đè.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={download}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-black transition active:scale-95"
          >
            <Download aria-hidden className="h-4 w-4" />
            Tải file sao lưu
          </button>
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="glass-pill inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-semibold text-white transition active:scale-95"
          >
            <Upload aria-hidden className="h-4 w-4" />
            Khôi phục từ file
          </button>
          <input
            ref={input}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="Chọn file sao lưu"
            onChange={(event) => void restore(event.target.files?.[0])}
          />
        </div>
        {result && (
          <p
            role={result.ok ? "status" : "alert"}
            className={
              result.ok ? "text-sm text-emerald-400" : "text-sm text-red-400"
            }
          >
            {result.text}
          </p>
        )}
      </section>
    </div>
  );
}
