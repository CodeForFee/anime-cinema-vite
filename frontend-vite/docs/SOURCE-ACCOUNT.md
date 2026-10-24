# Tài khoản AnimeVietsub trong Capynime

Capynime hiện dùng tài khoản **của AnimeVietsub**, chưa có dịch vụ tài khoản riêng. Web gọi nguồn qua AVS Helper với cookie của cùng hồ sơ trình duyệt; Android gọi qua Capacitor HTTP với CookieManager của WebView. Cookie Chrome không tự chuyển sang CookieManager của APK.

## Trạng thái hiện tại

- Có biểu mẫu email/tên đăng nhập và mật khẩu. Core lấy CSRF mới, gửi `password_md5` theo giao thức nguồn, rồi đọc lại danh tính. Không lưu mật khẩu trong localStorage.
- Khi quay lại tab hoặc khi APK hoạt động trở lại, ứng dụng đọc lại phiên trong cookie jar tương ứng. Lỗi mạng/trang xác minh không được coi là đã đăng xuất; yêu cầu kiểm tra cũ không được ghi đè đăng nhập/đăng xuất mới.
- Dữ liệu hồ sơ, thông báo, bình luận riêng được tách theo ID người dùng và xóa khỏi bộ nhớ khi đổi tài khoản; không ghi xuống cache IndexedDB.
- Đăng ký và Google trực tiếp trong giao diện Capynime trên cả web/APK **chưa hoàn thành**. Không thêm nút mở trang nguồn vì người dùng đã từ chối cách đó; không chuyển sang tài khoản Capynime riêng khi chưa được chấp thuận.

## Vì sao link Google được cung cấp chưa đủ

Link mẫu dùng client ID của nguồn, `origin=https://animevietsub.sale`, `display=popup`, `response_type=id_token` và `redirect_uri=gis_transform`. Đó là yêu cầu popup do Google Identity Services tạo cho trang nguồn, không phải API đăng nhập trả session cho Capynime. Không hardcode URL đầy đủ, tham số của một lần đăng nhập, hay giả mạo origin/user agent.

[Tài liệu GIS popup](https://developers.google.com/identity/gsi/web/guides/display-button) yêu cầu nơi nhận credential tương ứng (callback JavaScript hoặc login URI theo kiểu tích hợp). Sau khi có credential hợp lệ, phía nguồn vẫn phải xác thực nó và tạo session. Riêng Android, [Google không hỗ trợ đăng nhập trong WebView](https://developers.google.com/identity/siwg/best-practices); tích hợp native cần OAuth client Android trong cùng Google Cloud project của bên xác thực.

Người dùng xác nhận không có quyền cấu hình OAuth của AnimeVietsub. Google trên trang nguồn đã được kiểm chứng bằng Chrome thật và web Capynime nhận được phiên qua AVS Helper. Chưa có hợp đồng chuyển phiên từ Chrome sang APK được nguồn hỗ trợ; việc đọc Network bằng MCP khi phát triển không cung cấp khả năng đó cho ứng dụng Android. Tài khoản Capynime riêng là một phương án khác, cần OAuth/backend riêng và không tự đồng bộ tài khoản nguồn; người dùng chưa chấp thuận.

## Hợp đồng nguồn đã quan sát

- HTML Google dùng `data-login_uri="https://animevietsub.sale/login/google/"`. Người dùng tự chọn tài khoản; request POST callback trả 302, thấy tên trường `credential` và `g_csrf_token`. Không lưu các giá trị này vào repo.
- Đã mở login với `_fxRef=http://localhost:4100/`; sau Google trình duyệt vẫn ở trang chủ nguồn, không tự về Capynime. Không được giả định `_fxRef` điều khiển được chuyển hướng Google; phía app cần xác nhận phiên rồi xử lý việc quay về.
- Đăng ký: POST `/account/register/`, `form#form-register`; trường `username`, `password`, `repassword`, `email`, `_csrf`, `_fxRef`, `register[password_md5]`, `submit`. Tên đăng nhập 3–20 ký tự chữ/số/gạch dưới. Có Cloudflare Turnstile nằm trong form, nên chỉ biết tên trường chưa đủ để gửi đăng ký hợp lệ.
- Script kiểm tra username gọi GET `/ajax/check-handle.php?handle=...`. Chưa gửi đăng ký/tạo tài khoản thật; chưa kiểm chứng widget khi nhúng vào app.

## Kiểm chứng

`pnpm exec vitest run src/core/source/endpoints/comments/fetch.spec.ts src/features/account/store.spec.ts src/features/account/hooks/use-session-return.spec.tsx` kiểm tra CSRF/hash, thất bại nguồn, xác minh phiên, lỗi mạng, race với logout, focus/native resume và cách ly cache tài khoản.

Ngày 2026-10-24 đã kết nối Chrome hiện tại bằng Chrome DevTools MCP1.12.0. Login/register trả HTTP200 trong browser dù Node fetch trực tiếp vẫn HTTP403. Sau khi người dùng tự đăng nhập Google, đọc lại trang lịch chiếu xác nhận nguồn đã đăng nhập; web Capynime tại localhost4100 có user và không còn nút đăng nhập. Đây là kiểm chứng việc dùng chung phiên trình duyệt hiện có, chưa phải nút Google/đăng ký mới trong ứng dụng hoặc Google trong APK.
