import { TitleBody } from "@/features/title/components/TitleBody"
import { useTitleDetail } from "@/features/title/hooks/use-title-detail"
import { Dialog } from "@/shared/ui/dialog"

/** Desktop: the title preview as a large dialog over the page, Netflix style */
export default function TitleModal() {
  const t = useTitleDetail()
  if (!t.hasContent) return null

  return (
    <Dialog
      open={t.isOpen}
      onClose={t.close}
      contentRef={t.bodyRef}
      className="max-w-[1040px] max-h-[92vh] rounded-[8px] border-[#333] bg-[#181818] p-0 text-white shadow-[0_0_80px_rgba(0,0,0,0.95)]"
    >
      <TitleBody t={t} />
    </Dialog>
  )
}
