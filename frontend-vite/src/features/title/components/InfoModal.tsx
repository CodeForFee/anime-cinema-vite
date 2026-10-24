import { lazy, Suspense } from "react";

import { useFormFactor } from "@/shared/lib/form-factor";

// one chunk per form factor: a phone never downloads the desktop dialog, and the other way round
const TitleSheet = lazy(() => import("@/features/title/mobile/TitleSheet"));
const TitleModal = lazy(() => import("@/features/title/desktop/TitleModal"));

/** The preview of a title (useUIStore.openInfoModal): a sheet on mobile, a dialog on desktop */
export function InfoModal() {
  const formFactor = useFormFactor();
  return (
    <Suspense fallback={null}>
      {formFactor === "mobile" ? <TitleSheet /> : <TitleModal />}
    </Suspense>
  );
}
