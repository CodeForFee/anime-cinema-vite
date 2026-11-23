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
      className="flex h-11 w-full items-center justify-between gap-3 text-left text-sm text-white"
    >
      {label}
      {/* a block: an inline <span> ignores width and height, and the knob then slid past the track */}
      <span
        aria-hidden
        className={cn(
          "relative block h-6 w-10 shrink-0 rounded-full transition-colors",
          on ? "bg-primaryRed" : "bg-white/20",
        )}
      >
        <span
          className={cn(
            "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            on ? "translate-x-4" : "translate-x-0",
          )}
        />
      </span>
    </button>
  );
}

/**
 * Playback choices kept for every episode (features/player/store.ts). No frame of its own: the speed sheet
 * and the settings page each put it in theirs.
 */
export function PlaybackToggles() {
  const autoPlayNext = usePlayerStore((s) => s.autoPlayNext);
  const setAutoPlayNext = usePlayerStore((s) => s.setAutoPlayNext);
  const autoSkip = usePlayerStore((s) => s.autoSkip);
  const setAutoSkip = usePlayerStore((s) => s.setAutoSkip);
  return (
    <div>
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
