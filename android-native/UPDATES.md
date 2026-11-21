# Cập nhật ứng dụng qua GitHub

**Từ 1.2.0:** khi mở app, nếu GitHub có bản mới, app **tự tải nền** và kiểm tra, xong mới hiện hộp "Cài đặt"; cài qua `PackageInstaller`. Lần đầu Android vẫn hỏi xác nhận; từ khi Capynime đã tự cài mình một lần, Android 12+ cập nhật không cần hỏi lại. APK release ký bằng khóa của app Capacitor (`frontend-vite/android/keystore.properties`, git-ignore); build từ worktree khác: `node build.mjs release -PcapynimeKeystoreProperties=<đường dẫn>`. Bản cũ ký bằng khóa debug phải gỡ một lần.

Ứng dụng đọc release công khai của [`CodeForFee/anime-cinema-vite`](https://github.com/CodeForFee/anime-cinema-vite/releases). Tự kiểm tra khi mở app theo thời gian chờ của updater; nút tải xuống trên header cho kiểm tra thủ công bất kỳ lúc nào. Không cần đăng nhập tài khoản phim hoặc GitHub.

Updater chỉ nhận asset **`Capynime-native-release.apk`** ở release ổn định. Các APK web/Capacitor hiện có tên `Capynime-2.0.20.apk` thuộc ứng dụng khác, nên không được đề nghị cài đè vào app native.

Người dùng chọn tải/cập nhật, app kiểm tra APK rồi mở trình cài đặt Android. Android yêu cầu cho phép cài từ nguồn này và xác nhận cài đặt; app không tự bật quyền hay âm thầm cài. Khi cập nhật đúng package và chữ ký, lịch sử, danh sách và phiên trên thiết bị được giữ lại.

## Phát hành bản native mới

**Tự động:** mỗi lần code trong `android-native/` được đẩy lên `main`, workflow tự build, ký và tạo release `native-v1.2.<số lần chạy>` có APK — app nào đang cài sẽ thấy bản mới ở lần mở kế tiếp. Có thể chạy tay ở tab Actions (workflow_dispatch). Cần 4 secret bên dưới, nếu không workflow dừng ở bước ký.

Workflow [native-release.yml](../.github/workflows/native-release.yml) chạy khi có tag `native-vMAJOR.MINOR.PATCH` được push. Chỉ tạo tag sau khi các thay đổi đã được commit/push vào GitHub và kiểm tra xong.

Thiết lập bốn repository secrets:

| Secret | Giá trị |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | Keystore dùng ký APK native, mã hóa base64 |
| `ANDROID_STORE_PASSWORD` | Mật khẩu keystore |
| `ANDROID_KEY_ALIAS` | Alias khóa ký |
| `ANDROID_KEY_PASSWORD` | Mật khẩu khóa ký |

**Phải dùng cùng khóa ký cho mọi bản cập nhật.** Bản cài thử hiện dùng khóa debug cục bộ; APK ký bằng khóa khác sẽ bị updater từ chối và Android cũng không chấp nhận cập nhật giữ dữ liệu. Chốt khóa phát hành trước khi phân phối rộng. Không commit keystore hoặc ghi mật khẩu vào file workflow.

Ví dụ tạo bản mới sau `1.1.0`:

```sh
git tag native-v1.1.1
git push origin native-v1.1.1
```

Workflow lấy `versionName` từ tag, tăng `versionCode` theo số lần chạy, chạy kiểm thử/lint, build có ký, rồi tạo GitHub Release chứa APK và SHA-256. Các release web hiện tại vẫn dùng quy trình riêng.

Build local bằng khóa phát hành nếu đã cấu hình:

```powershell
$env:CAPYNIME_KEYSTORE = 'C:/secure/capynime-release.jks'
# Cung cấp CAPYNIME_STORE_PASSWORD, CAPYNIME_KEY_ALIAS, CAPYNIME_KEY_PASSWORD
# qua môi trường riêng của bạn; không ghi giá trị vào source.
node android-native/build.mjs verify
```

## Kiểm tra và phạm vi xác minh

- Chỉ dùng HTTPS và máy chủ GitHub/CDN được updater cho phép; HTTP của nguồn phim và cookie tài khoản không tham gia cập nhật.
- Bỏ qua draft, prerelease, phiên bản cũ và asset sai tên.
- Giới hạn dung lượng tải, xóa file dở khi thất bại/hủy, kiểm tra kích thước và digest GitHub khi có.
- Trước khi cài, kiểm tra đúng application ID, versionCode mới hơn và chữ ký trùng bản đang cài.
- Hiện repo chưa có asset release native để thử một lượt tải/cài bản nâng cấp từ GitHub thật. Các kiểm thử policy và kiểm tra thủ công trong app không thay thế lần thử đó.

Tham khảo: [GitHub Releases API](https://docs.github.com/en/rest/releases/releases), [Android package installation permission](https://developer.android.com/reference/android/content/pm/PackageManager#canRequestPackageInstalls()), [FileProvider](https://developer.android.com/reference/androidx/core/content/FileProvider).
