<div align="center">

# 🎬 Capynime

**Xem anime Vietsub nhanh, gọn, không cần backend.**

Web app + ứng dụng Android. Mọi request đều đi thẳng từ thiết bị của người xem.

[![Tải APK](https://img.shields.io/badge/Android-tải%20APK-3DDC84?logo=android&logoColor=white)](../../releases/latest)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Capacitor](https://img.shields.io/badge/Capacitor-8-119EFF?logo=capacitor&logoColor=white)

</div>

---

## ✨ Tính năng

- 🏠 **Trang chủ** gọn: slider nổi bật, top 10, các kệ phim cuộn mượt, lazy-load.
- 🔎 **Khám phá** theo thể loại, tìm kiếm nhanh, lịch sử xem và danh sách yêu thích.
- ▶️ **Player riêng của app** vẽ trên player nguồn, một giao diện cho mọi thiết bị:
  - Chạm hai lần hai bên để tua ±10 giây, vuốt ngang để tua.
  - Toàn màn hình: vuốt dọc bên phải chỉnh âm lượng, bên trái chỉnh độ sáng.
  - Tốc độ phát và chọn tập mở dạng **popup dropup** ngay trên nút (desktop).
  - **Chế độ rạp phim** căn giữa, phóng to dần, phím tắt `T`.
  - Phím tắt desktop: `Space`/`K` phát/dừng, `←` `→` tua, `↑` `↓` âm lượng, `M` tắt tiếng, `F` toàn màn hình, `T` chế độ rạp.
  - Nhớ vị trí từng tập ("Xem tiếp"), gợi ý tập tiếp, bỏ qua intro.
- 🛡️ **Chặn quảng cáo** ở tầng mạng và trong trang player.
- 📱 **PWA** trên web và **app Android** (không cần extension).

## 🧱 Cấu trúc

| Thư mục | Nội dung | Giấy phép |
|---|---|---|
| [`frontend-vite/`](frontend-vite/) | Web app Vite + React + TypeScript, cũng là gốc của app Android (Capacitor) | GPL-3.0-only (xem `NOTICE.md`) |
| [`avs-helper-extension/`](avs-helper-extension/) | Extension Chrome/Edge (Manifest V3) mà bản web cần | MIT |

## 🚀 Chạy thử

```sh
# 1. Build extension, rồi nạp avs-helper-extension/manifest-v3/extension bằng "Load unpacked"
cd avs-helper-extension && pnpm i && pnpm build

# 2. Chạy web
cd ../frontend-vite && pnpm i && pnpm dev      # http://localhost:4100
```

Sau khi build lại extension, nhớ **reload** nó trong `chrome://extensions`.

| Lệnh (trong `frontend-vite`) | Việc |
|---|---|
| `pnpm test` | Chạy các spec (Vitest) |
| `pnpm lint` | Biome, chỉ báo lỗi |
| `pnpm build` | Kiểm tra kiểu và build ra `dist/` |
| `pnpm build:apk` | APK debug |
| `pnpm release [patch\|minor\|major]` | Tăng phiên bản, build APK + AAB đã ký vào `release/` |

> `pnpm release` cần JDK 21 và `android/keystore.properties`. Chi tiết trong [frontend-vite/README.md](frontend-vite/README.md).

## 📲 Cài app Android

Tải file `.apk` mới nhất ở trang **[Releases](../../releases/latest)** rồi cài. Điện thoại sẽ cảnh báo vì APK
ngoài Google Play, đó là bình thường. Nếu cài không được, thường là do bản đang cài ký bằng khoá khác: gỡ bản cũ rồi cài lại.

## 🌐 Triển khai

Web là file tĩnh (`pnpm build` → `frontend-vite/dist`), cần rewrite mọi đường dẫn về `index.html` (đã có
`vercel.json` cho Vercel). Máy chủ không liên lạc với trang nguồn nên IP của nó không quan trọng.

Extension chỉ hoạt động trên các host trong [`avs-helper-extension/allowlist.yaml`](avs-helper-extension/allowlist.yaml):
thêm host production vào đó, build lại và cho người xem cài bản đó.

## 🔗 Host nguồn

Host nguồn hiện là `animevietsub.sale` (player ở `*.googleapiscdn.com`). Khi đổi, sửa đồng thời:

1. `frontend-vite/src/constants.ts`
2. `frontend-vite/capacitor.config.ts`
3. `avs-helper-extension/map-referer.json`

rồi build lại extension và app.

## ⚖️ Giấy phép

Web: GPL-3.0-only, vì lớp dữ liệu và player có nguồn gốc từ `anime-vsub/desktop-web`. Extension: MIT.
