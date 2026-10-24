import { expect, test } from "vitest";
import Account from "@/core/source/endpoints/account/parse";

// Shape of /account/info/ (2026-10), values made up
const page = `<section class="user-profile-edit"><img id="upe-avatar-img" src="https://cdn.x/a.jpg">
<h1 class="upe-name">Tên A</h1><div class="upe-handle">@abc_1</div><div class="upe-joined"> Tham gia 04/2026</div>
<a href="https://animevietsub.sale/thanh-vien/7/" class="upe-public-btn">x</a>
<div class="upe-panel" id="upe-panel-hoso"><input id="upe-fullname" value="Tên A">
<label><input type="radio" name="gender" value="1"> Nam</label><label><input type="radio" name="gender" value="0" checked=""> Nữ</label>
<textarea id="upe-bio">xin chào</textarea><input name="social_fb" value="https://facebook.com/a"><input name="social_tiktok" value="">
<div id="upe-chips"><label class="upe-chip"><input type="checkbox" value="1"> Action </label><label class="upe-chip"><input type="checkbox" value="2" checked> Adventure </label></div>
<input type="checkbox" id="upe-private" value="1"></div>
<div class="upe-panel" id="upe-panel-taikhoan">
<div class="upe-acc-row"><span id="upe-current-email">a@b.c</span><span class="upe-badge upe-badge-ok">ok</span></div>
<div class="upe-acc-row"><span id="upe-current-username">@abc_1</span><button data-modal="username"></button></div>
<div class="upe-acc-row"><div class="upe-acc-value upe-hint">Bạn đăng nhập bằng Google OAuth. Chưa đặt mật khẩu.</div></div></div>
<button id="upe-submit-password" data-mode="set"></button></section>`;

test("account page: profile form, genres and account rows", () => {
  const a = Account(page);
  expect(a).toMatchObject({
    name: "Tên A",
    handle: "@abc_1",
    avatar: "https://cdn.x/a.jpg",
    publicUrl: "https://animevietsub.sale/thanh-vien/7/",
    profile: { fullname: "Tên A", gender: "0", bio: "xin chào", isPrivate: false },
    email: "a@b.c",
    emailVerified: true,
    username: "abc_1",
    passwordMode: "set",
    emailNeedsPassword: false,
  });
  expect(a?.profile.social.social_fb).toBe("https://facebook.com/a");
  expect(a?.genres).toEqual([
    { id: "1", name: "Action", checked: false },
    { id: "2", name: "Adventure", checked: true },
  ]);
  expect(Account("<title>Đăng nhập</title><form id=SignInForm></form>")).toBeNull();
});
