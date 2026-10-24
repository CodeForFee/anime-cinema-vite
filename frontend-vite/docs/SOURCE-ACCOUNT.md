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

Người dùng xác nhận không có quyền cấu hình OAuth của AnimeVietsub. Chưa có hợp đồng callback/token/session-handoff được nguồn cho phép dành cho Capynime. Vì vậy chưa có cơ sở để hứa Google trực tiếp cho tài khoản nguồn trên cả hai nền tảng. Tài khoản Capynime riêng là một phương án khác, cần OAuth/backend riêng và không tự đồng bộ tài khoản nguồn; người dùng chưa chấp thuận.

## Kiểm chứng

`pnpm exec vitest run src/core/source/endpoints/comments/fetch.spec.ts src/features/account/store.spec.ts src/features/account/hooks/use-session-return.spec.tsx` kiểm tra CSRF/hash, thất bại nguồn, xác minh phiên, lỗi mạng, race với logout, focus/native resume và cách ly cache tài khoản.

Chưa đăng nhập/đăng ký bằng tài khoản thật hoặc kiểm chứng Google trên thiết bị. Không có thông tin đăng nhập thử; các request tự động đến trang login/register bị chặn/xác minh khu vực. Build/test qua không chứng minh đăng nhập nguồn thật thành công.
