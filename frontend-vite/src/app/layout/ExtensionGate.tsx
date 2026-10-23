import { transport } from "@/platform/transport"
import { Puzzle } from "lucide-react"

/**
 * Every request of this app goes through the AVS Helper extension (see src/core/source/transport.ts).
 * The extension stamps data-http-version on <html> at document_start; without it nothing can load.
 * Inside the Android app the native transport stands in for it, so this gate is always open there.
 */
export function ExtensionGate({ children }: { children: React.ReactNode }) {
  if (transport.version) return <>{children}</>

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-5 px-6 text-center">
      <Puzzle className="h-16 w-16 text-primaryRed" aria-hidden />
      <h1 className="text-2xl font-bold text-white">Cần cài extension AVS Helper</h1>
      <p className="text-sm leading-relaxed text-gray-400">
        Trang này lấy dữ liệu và phát video trực tiếp từ trình duyệt của bạn thông qua extension AVS Helper. Chưa có
        extension thì trang không thể tải phim.
      </p>
      <ol className="space-y-2 text-left text-sm text-gray-300">
        <li>1. Mở <code className="rounded bg-white/10 px-1.5 py-0.5">chrome://extensions</code> và bật Developer mode.</li>
        <li>2. Bấm “Load unpacked”, chọn thư mục <code className="rounded bg-white/10 px-1.5 py-0.5">avs-helper-extension/manifest-v3/extension</code>.</li>
        <li>3. Tải lại trang này.</li>
      </ol>
      <button
        type="button"
        onClick={() => location.reload()}
        className="h-10 rounded-full bg-primaryRed px-6 text-sm font-semibold text-white hover:bg-red-600"
      >
        Tôi đã cài, tải lại
      </button>
    </main>
  )
}
