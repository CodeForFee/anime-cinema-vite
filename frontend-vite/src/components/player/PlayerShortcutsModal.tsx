
import React from "react";
import { X } from "lucide-react";
import { Button } from "../lightswind/button";
import { usePlayerStore } from "../../stores/usePlayerStore";

const SHORTCUTS = [
  { keys: ["Space"], description: "Phát / tạm dừng" },
  { keys: ["←", "→"], description: "Lùi / tới 10 giây" },
  { keys: ["↑", "↓"], description: "Tăng / giảm âm lượng" },
  { keys: ["M"], description: "Bật / tắt âm thanh" },
  { keys: ["F"], description: "Toàn màn hình" },
  { keys: ["T"], description: "Mở rộng khung phát" },
  { keys: ["N"], description: "Tập kế tiếp" },
  { keys: ["Esc"], description: "Đóng bảng đang mở" },
];

// Rendered inside the player box (not a portal) so it is also visible in fullscreen
export const PlayerShortcutsModal: React.FC = () => {
  const close = usePlayerStore((s) => s.setShowShortcuts);

  return (
    <div
      role="dialog"
      aria-label="Phím tắt"
      onClick={() => close(false)}
      className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-full w-full max-w-md overflow-y-auto rounded-xl border border-white/10 bg-[#181818] p-5 text-white shadow-2xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold">Phím tắt</h3>
          <Button
            variant="unstyled"
            size="unstyled"
            onClick={() => close(false)}
            aria-label="Đóng"
            className="h-9 w-9 rounded-full text-gray-300 transition-colors hover:bg-white/10 hover:text-white [&_svg]:size-5"
          >
            <X />
          </Button>
        </div>

        <dl className="divide-y divide-white/10">
          {SHORTCUTS.map((item) => (
            <div key={item.description} className="flex items-center justify-between gap-4 py-2.5 text-sm">
              <dt className="text-gray-300">{item.description}</dt>
              <dd className="flex items-center gap-1.5">
                {item.keys.map((k) => (
                  <kbd
                    key={k}
                    className="min-w-7 rounded border border-white/20 bg-white/10 px-2 py-0.5 text-center font-sans text-xs font-semibold text-white"
                  >
                    {k}
                  </kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
};
