import { TitleBody } from "@/features/title/components/TitleBody";
import { useTitleDetail } from "@/features/title/hooks/use-title-detail";
import { SHEET_EXIT_MS, Sheet } from "@/shared/ui/sheet";

/** Mobile: the title preview as a full-height sheet; pulling its picture down closes it */
export default function TitleSheet() {
  const t = useTitleDetail({ closeDelayMs: SHEET_EXIT_MS });
  if (!t.hasContent) return null;

  return (
    <Sheet
      open={t.isOpen}
      onClose={t.close}
      contentRef={t.bodyRef}
      className="h-[100dvh] max-h-[100dvh] bg-[#181818] pt-[var(--inset-top)] pb-[var(--inset-bottom)] text-white"
    >
      <TitleBody t={t} />
    </Sheet>
  );
}
