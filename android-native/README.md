# Capynime Android native

Ứng dụng Android Kotlin + Jetpack Compose, chuyển giao diện và các luồng của `../frontend-vite` sang native. Source nằm trong repo này; không cần build React/Vite để chạy app Android. Project kế thừa phần Compose đã được làm ở `E:/Code/Minh/capynime-android`, bổ sung Media3, tài khoản native, skip opening/ending và giới hạn cache.

## Build và cài

Yêu cầu: Node.js 18+, JDK 21+, Android SDK Platform 37, kết nối mạng để Gradle tải dependency lần đầu. `build.mjs` tự tìm JDK phù hợp và Android SDK trong `ANDROID_HOME`, `ANDROID_SDK_ROOT` hoặc thư mục SDK mặc định trên Windows; không sửa biến môi trường của máy.

```powershell
cd android-native
node build.mjs verify
adb -d install -r artifacts/Capynime-native-release.apk
```

- `node build.mjs debug`: APK debug.
- `node build.mjs release`: APK release tối ưu bằng R8 và resource shrinking.
- `node build.mjs verify`: unit tests, Android lint và APK release.
- Có thể mở trực tiếp thư mục này trong Android Studio hoặc dùng `./gradlew :app:assembleRelease` khi JDK/SDK đã cấu hình.
- APK được chép ra `artifacts/Capynime-native-release.apk`; thư mục này không commit.
- Android 8.0+ (API 26); application ID `app.capynime.compose`, phiên bản `1.1.0` (code 2). Cài `-r` giữ lại dữ liệu của bản Compose cũ nếu cùng chữ ký.
- Bản sideload hiện dùng debug keystore cục bộ để cập nhật bản đã cài trên máy thử. Không chứa keystore hoặc mật khẩu trong repo. Cần cấu hình khóa release riêng trước khi phát hành cửa hàng.

## Giao diện và chức năng

| Phần của bản web | Bản native |
| --- | --- |
| Trang chủ, hero, carousel, kệ phim | Compose, cùng nền tối, màu đỏ/vàng, font Be Vietnam Pro và hình ảnh nguồn |
| Điều hướng | Thanh dock 6 mục; giữ trạng thái khi đổi tab; back và fullscreen theo Android |
| Khám phá, thể loại, xếp hạng, tìm kiếm | Danh sách/lưới lazy, lọc theo menu nguồn, phân trang, tìm kiếm có trì hoãn nhập |
| Lịch chiếu | Theo ngày và giờ từ nguồn |
| Chi tiết phim | Nội dung, thông tin, mùa/tập, liên quan, ảnh HD AniList khi khớp tên |
| Danh sách yêu thích và lịch sử | Lưu trên thiết bị, tiếp tục tập đang xem, xóa lịch sử |
| Phát video | Media3/ExoPlayer cho URL trực tiếp; thử chuyển HLS do player nguồn tải sang Media3, tự dự phòng về player nguồn khi không tương thích |
| Điều khiển | Native Compose: seek, double tap ±10 giây, tốc độ, chất lượng, khóa chạm, fullscreen, tiếp tục xem và tự chuyển tập |
| Opening/ending | Tra AniList/AniSkip theo phim và tập; chỉ hiện nút khi có khoảng thời gian hợp lệ |
| Bình luận | Đọc, mở trả lời, đăng bình luận, spoiler và trạng thái chờ duyệt như luồng web |
| Tài khoản | Đăng nhập bằng tài khoản nguồn; hồ sơ, mạng xã hội, thể loại yêu thích, riêng tư, đổi username/email/mật khẩu, bình luận của tôi, thông báo |
| Cập nhật ứng dụng | Tự kiểm tra GitHub Releases khi mở app, kiểm tra thủ công từ header, tải APK native và xác nhận cài qua Android |

### Thay đổi 1.2.0 (2026-11-20)

- Giao diện mới "cinema ink": mặt phẳng đặc, không blur/kính/bóng, thanh điều hướng đáy cố định, banner lướt ngang, hàng Top số lớn, poster 3 cột có chú thích dưới ảnh, chuyển cảnh ngắn (fade 180 ms, trang xem trượt 1/10 màn).
- Video: nguồn có "cookie gate" (403 + Set-Cookie mỗi giờ) — app thử lại một lần; luồng HLS của player nguồn là ảnh PNG giả trên Google Photos do service worker giải, Media3 không phát được nên tắt chuyển sang Media3 (trước đây mất ~16 s mỗi tập); player nguồn tự phát khi sẵn sàng; WebView được làm ấm khi mở app; không tiêm `player-enhance.js` khi CapyCinema tắt.

### Giới hạn cần biết

- Trang và giao diện app là Compose. Player nhúng vẫn được dùng khi CDN không cung cấp luồng tương thích với Media3; không quảng cáo mọi nguồn video là native.
- FSR, Anime4K, tăng màu và âm thanh WebAudio của bản web chạy trong **chế độ player nguồn**. Màn CapyCinema giải thích và cho chuyển về chế độ đó; các hiệu ứng này không được giả lập thành tùy chọn Media3 không hoạt động.
- AniSkip là dữ liệu cộng đồng: không có kết quả, sai phim/năm hoặc khoảng thời gian không hợp lệ thì không hiện nút skip.
- Google và đăng ký trực tiếp trong APK chưa có luồng chuyển phiên được nguồn xác nhận; đăng nhập email/tên tài khoản và mật khẩu nguồn hoạt động qua HTTP của app. Phiên Chrome không tự chia sẻ vào app.
- Máy chủ nguồn và CDN là dịch vụ bên ngoài. Lỗi mạng/xác minh được hiển thị kèm hành động thử lại; không thay bằng dữ liệu phim mẫu.

## Cấu trúc và hiệu năng

- **UI:** Compose BOM `2026.09.00`, Material 3, Navigation Compose, StateFlow/coroutines, Coil 3 và Lucide. Glass tự giảm trên máy yếu; các danh sách chỉ compose vùng cần hiển thị và một vùng đệm nhỏ.
- **Dữ liệu:** OkHttp + Jsoup; parser Kotlin port từ các endpoint của web. Parse chạy ngoài main thread. Phiên nguồn ở cookie jar riêng, không lưu mật khẩu; Android backup bị tắt để không sao lưu phiên đăng nhập.
- **Video:** Media3 `1.11.1`, HLS, bộ giải mã phần cứng, xử lý audio focus và rút tai nghe. Chỉ tạo engine khi bắt đầu xem; dừng khi app vào nền và giải phóng khi rời màn hình. Buffer giới hạn 16 MiB ở chế độ nhẹ, 32 MiB ở chế độ thường.
- **Cache:** tối đa 24 trang HTML và 64 kết quả đã parse trong phiên; ảnh có cache của Coil; xóa cache riêng tư khi đổi tài khoản. Hủy request đang chờ khi coroutine bị hủy.
- **Release:** R8, resource shrinking, baseline profile đã có từ bản native trước. Profile cũ không thay thế phép đo lại trên APK mới.
- Hai asset `player-bridge.js` và `player-enhance.js` trong `app/src/main/assets` chỉ phục vụ player nguồn; nội dung khớp bản trong `frontend-vite/public` tại thời điểm port.

Tài liệu nền tảng: [Media3](https://developer.android.com/media/media3/exoplayer/hello-world), [Compose performance](https://developer.android.com/develop/ui/compose/performance), [Baseline Profiles](https://developer.android.com/develop/ui/compose/performance/baseline-profiles).

Kết quả build và thử máy thực được ghi tại `VERIFICATION.md` và log tương ứng trong `../.agent/log/`.

Cấu hình phát hành và chữ ký để cập nhật qua GitHub: [UPDATES.md](UPDATES.md).
