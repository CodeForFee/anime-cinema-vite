import { AlertTriangle, AudioLines, Cpu, Palette, Sparkles } from "lucide-react";
import { type ReactNode, useState } from "react";

import { Sheet } from "@/features/player/components/PlayerSheets";
import type { UpscaleMode } from "@/features/player/engines/enhance/model";
import type { EnhanceView } from "@/features/player/hooks/use-enhance";
import { usePlayerStore } from "@/features/player/store";
import { cn } from "@/shared/lib/utils";

type Feature = "fsr" | "anime4k" | "color" | "surround";

const FEATURES: Record<Feature, { title: string; detail: string; warning: string; icon: ReactNode }> = {
  fsr: {
    title: "Upscale chất lượng",
    detail: "Phóng hình lên đúng độ phân giải màn hình và làm nét viền (AMD FSR)",
    warning:
      "Tính năng thử nghiệm: xử lý từng khung hình trên GPU nên tốn pin hơn và máy có thể ấm lên; máy yếu có thể giật. Máy NVIDIA đang bật RTX Video Super Resolution sẽ được thay bằng tính năng này.",
    icon: <Sparkles aria-hidden className="h-5 w-5" />,
  },
  anime4k: {
    title: "Upscale Anime4K",
    detail: "Mạng nơ-ron làm nét nét vẽ anime, đẹp nhất nhưng nặng nhất (WebGPU)",
    warning:
      "Nặng nhất: chạy mạng nơ-ron trên GPU ở mọi khung hình. Chỉ nên bật trên PC/laptop hoặc điện thoại mạnh; máy sẽ nóng và hao pin nhanh. Nếu máy không theo kịp, app tự chuyển về Upscale chất lượng.",
    icon: <Cpu aria-hidden className="h-5 w-5" />,
  },
  color: {
    title: "Màu sắc sống động",
    detail: "Màu nhạt đậm lên, giữ tông da tự nhiên, đen sâu hơn và tương phản nhẹ; dùng được cả khi không upscale",
    warning:
      "Chỉnh màu từng khung hình trên GPU (nhẹ hơn upscale): màu sẽ đậm và tươi hơn bản gốc một chút, tông da được giữ tự nhiên. Tốn thêm chút pin; tắt nếu thấy màu không hợp mắt.",
    icon: <Palette aria-hidden className="h-5 w-5" />,
  },
  surround: {
    title: "Âm thanh vòm 7.1.4",
    detail: "Rạp ảo 7.1.4 từ stereo: bass sâu, lời thoại ở giữa, nhạc và hiệu ứng bao quanh, lớp âm trên đầu",
    warning:
      "Giả lập rạp từ âm thanh stereo của phim (không phải Dolby Atmos thật, vì nguồn không có track Atmos). Đeo tai nghe để có không gian 3D đầy đủ; dùng loa ngoài thì chọn chế độ Loa. Nếu máy đang bật Âm thanh không gian (Spatial Audio) hoặc Dolby của hệ thống, hãy tắt nó để tránh xử lý hai lần.",
    icon: <AudioLines aria-hidden className="h-5 w-5" />,
  },
};

const NOTICE = {
  downgraded: "Máy không theo kịp Anime4K: tập này tạm dùng Upscale chất lượng, tập sau thử lại Anime4K.",
  stopped: "Tạm dừng xử lý hình để video mượt; lựa chọn vẫn giữ, tập sau tự bật lại.",
};

/** Upscale (FSR or Anime4K) and virtual surround; turning one on always asks first, with what it costs */
export function EnhanceSheet({ view, onClose, anchorX }: { view: EnhanceView; onClose: () => void; anchorX?: number }) {
  const setUpscale = usePlayerStore((s) => s.setUpscale);
  const setSurround = usePlayerStore((s) => s.setSurround);
  const setSurroundMode = usePlayerStore((s) => s.setSurroundMode);
  const setColor = usePlayerStore((s) => s.setColor);
  const [confirming, setConfirming] = useState<Feature | null>(null);
  const lite = document.documentElement.hasAttribute("data-lite");
  const support = view.state?.support;

  const isOn = (f: Feature) =>
    f === "surround" ? view.surround : f === "color" ? view.color : view.upscale === f;
  const turn = (f: Feature, on: boolean) => {
    if (f === "surround") setSurround(on);
    else if (f === "color") setColor(on);
    else setUpscale(on ? (f as UpscaleMode) : "off");
  };
  /** Chosen but not running right now (and why), while the choice itself stays on */
  const pending = (f: Feature): string | undefined => {
    const s = view.state;
    if (!s || !isOn(f)) return;
    if (f === "surround" && !s.surround) return "Đang chờ trình duyệt cho phép âm thanh: tự bật khi video phát.";
    if (f === "anime4k" && s.upscale === "fsr") return "Tạm dùng Upscale chất lượng vì máy không theo kịp.";
    if ((f === "fsr" || f === "anime4k") && s.upscale === "off") return "Tạm dừng để giữ mượt.";
    if (f === "color" && !s.color) return "Tạm dừng để giữ mượt.";
  };
  const locked = (f: Feature): string | undefined => {
    if (view.outdated) return "Cập nhật extension AVS Helper (hoặc app) để dùng";
    if (!support) return;
    if (f === "surround" && !support.audio) return "Trình duyệt này không hỗ trợ";
    if ((f === "fsr" || f === "color") && !support.webgl2) return "Máy này không hỗ trợ WebGL2";
    if (f === "anime4k" && !support.webgpu) return "Máy này chưa hỗ trợ WebGPU";
    if (f === "anime4k" && lite) return "Tắt trên máy yếu để giữ mượt";
  };

  return (
    <Sheet
      title="CapyCinema"
      onClose={onClose}
      anchorX={anchorX}
      // desktop: a wide drop-up with the four switches side by side; phones: a side panel, portrait included
      width="min(720px,94%)"
      panelClassName="cn-side inset-x-auto left-auto top-2 bottom-2 right-[max(0.5rem,var(--inset-right))] w-[min(320px,78%)] lg:!max-h-[min(80%,480px)]"
    >
      {() =>
        confirming ? (
          <div className="space-y-3 overflow-y-auto px-4 pb-[max(1rem,var(--inset-bottom))] pt-1">
            <p className="flex items-center gap-2 text-sm font-bold text-amber-300">
              <AlertTriangle aria-hidden className="h-4 w-4" /> Bật {FEATURES[confirming].title}?
            </p>
            <p className="text-sm leading-relaxed text-gray-200">{FEATURES[confirming].warning}</p>
            {lite && confirming !== "surround" && (
              <p className="text-xs text-amber-300">Máy của bạn được nhận diện là máy yếu: dễ giật hơn.</p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setConfirming(null)} className="glass-button h-10 rounded-full px-4 text-sm font-semibold">
                Huỷ
              </button>
              <button
                type="button"
                onClick={() => {
                  turn(confirming, true);
                  setConfirming(null);
                }}
                className="h-10 rounded-full bg-white px-5 text-sm font-bold text-black active:scale-95"
              >
                Bật
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-1.5 overflow-y-auto px-3 pb-[max(0.75rem,var(--inset-bottom))] pt-1 lg:grid-cols-2 lg:gap-2 lg:px-4">
            {(Object.keys(FEATURES) as Feature[]).map((f) => {
              const on = isOn(f);
              const reason = locked(f);
              const error = on && pending(f);
              return (
                <div key={f} className="rounded-2xl bg-white/[0.06] px-3 py-2 ring-1 ring-white/10 lg:p-3">
                  <div className="flex items-center gap-3">
                    <span className={on ? "text-white" : "text-gray-400"}>{FEATURES[f].icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{FEATURES[f].title}</p>
                      {/* phones: title and switch only, so all four fit the short side panel */}
                      <p className={cn("text-xs leading-snug text-gray-400", reason ? "line-clamp-1" : "hidden lg:block")}>
                        {reason ?? FEATURES[f].detail}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      aria-label={FEATURES[f].title}
                      disabled={Boolean(reason) && !on}
                      onClick={() => (on ? turn(f, false) : setConfirming(f))}
                      className={cn(
                        "relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-40",
                        on ? "bg-primaryRed" : "bg-white/20",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-[left]",
                          on ? "left-[22px]" : "left-0.5",
                        )}
                      />
                    </button>
                  </div>
                  {f === "surround" && on && (
                    <fieldset className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-black/30 p-1">
                      <legend className="sr-only">Nghe bằng</legend>
                      {(["headphones", "speakers"] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          aria-pressed={view.surroundMode === mode}
                          onClick={() => setSurroundMode(mode)}
                          className={cn(
                            "h-8 rounded-lg text-xs font-semibold transition",
                            view.surroundMode === mode ? "bg-white text-black" : "text-gray-300",
                          )}
                        >
                          {mode === "headphones" ? "Tai nghe (3D)" : "Loa ngoài"}
                        </button>
                      ))}
                    </fieldset>
                  )}
                  {error && <p className="mt-2 text-xs text-amber-300">{error}</p>}
                </div>
              );
            })}
            {view.state?.notice && <p className="text-xs text-amber-300 lg:col-span-2">{NOTICE[view.state.notice]}</p>}
            {view.state?.error && <p className="text-xs text-red-300 lg:col-span-2">{view.state.error}</p>}
          </div>
        )
      }
    </Sheet>
  );
}
