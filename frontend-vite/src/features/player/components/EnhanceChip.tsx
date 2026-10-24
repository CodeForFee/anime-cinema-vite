import { Sparkles } from "lucide-react";

import { CHIP } from "@/features/player/components/control-parts";
import { cn } from "@/shared/lib/utils";

/** Opens the enhancement sheet (upscale, surround); lit while one of them is on */
export function EnhanceChip({ active, onOpen }: { active: boolean; onOpen: (button: HTMLElement) => void }) {
  return (
    <button
      type="button"
      aria-label={active ? "Nâng cao hình và tiếng, đang bật" : "Nâng cao hình và tiếng"}
      onClick={(e) => onOpen(e.currentTarget)}
      className={cn(CHIP, active && "!bg-white !text-black")}
    >
      <Sparkles aria-hidden className="h-4 w-4" />
      CapyCinema
    </button>
  );
}
