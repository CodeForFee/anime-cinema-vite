import { Link } from "@/lib/router";
import { Button } from "@heroui/react";
import { Film } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 space-y-6">
      <div className="w-20 h-20 rounded-3xl bg-primaryRed/10 border border-primaryRed/20 flex items-center justify-center text-primaryRed shadow-2xl">
        <Film className="w-8 h-8" />
      </div>

      <div className="space-y-2 max-w-md">
        <h2 className="text-3xl font-black text-white">404 - Không tìm thấy trang</h2>
        <p className="text-sm text-gray-400">
          Nội dung hoặc bộ phim bạn đang tìm kiếm không tồn tại hoặc đã được thay đổi đường dẫn.
        </p>
      </div>

      <Link href="/">
        <Button color="danger" radius="full" className="bg-primaryRed text-white font-bold px-6">
          Về Trang Chủ
        </Button>
      </Link>
    </div>
  );
}
