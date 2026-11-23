import { usePlayerStore } from "@/features/player/store";
import { cn } from "@/shared/lib/utils";

function Toggle({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex h-10 w-full items-center justify-between gap-3 rounded-xl px-1 text-sm text-white"
    >
      {label}
      <span
        aria-hidden
        className={cn(
          "relative h-6 w-10 shrink-0 rounded-full transition-colors",
          on ? "bg-primaryRed" : "bg-white/20",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
            on ? "translate-x-[1.125rem]" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}

/** Playback choices kept for every episode (features/player/store.ts), under the speed buttons */
export function PlaybackToggles() {
  const autoPlayNext = usePlayerStore((s) => s.autoPlayNext);
  const setAutoPlayNext = usePlayerStore((s) => s.setAutoPlayNext);
  const autoSkip = usePlayerStore((s) => s.autoSkip);
  const setAutoSkip = usePlayerStore((s) => s.setAutoSkip);
  return (
    <div className="border-t border-white/10 px-4 pb-[max(0.75rem,var(--inset-bottom))] pt-2">
      <Toggle
        label="Tự phát tập tiếp"
        on={autoPlayNext}
        onChange={setAutoPlayNext}
      />
      <Toggle
        label="Tự bỏ qua OP / tóm tắt"
        on={autoSkip}
        onChange={setAutoSkip}
      />
    </div>
  );
}
