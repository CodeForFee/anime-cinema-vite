import { beforeEach, expect, test, vi } from "vitest";

import { Login, Logout, Me, parseUser } from "@/core/source/endpoints/comments/fetch";
import { md5 } from "@/core/source/md5";
import { get, post } from "@/core/source/transport";

vi.mock("@/core/source/transport", () => ({ get: vi.fn(), post: vi.fn() }));
const signedIn = 'AvsComment.init({isLogin: true, userId: 12, userName: "viewer", userAvatar: "avatar"});';
const signedOut = "AvsComment.init({isLogin: false});";
const response = (data: string) => ({ data, status: 200, url: "https://animevietsub.sale/", headers: {} });

beforeEach(() => vi.resetAllMocks());

test("normal login uses a fresh CSRF token, handles attribute order/entities, and sends only the source password hash", async () => {
  vi.mocked(get).mockResolvedValue(response("<input value='a&amp;b' type='hidden' name='_csrf'>"));
  vi.mocked(post).mockResolvedValue(response(signedIn));
  expect(await Login(" viewer ", "secret")).toMatchObject({ id: 12, name: "viewer" });
  expect(post).toHaveBeenCalledWith(expect.stringContaining("/account/login/?_fxRef="), {
    email: "viewer", password: "", password_md5: md5("secret"), save_password: 1, _csrf: "a&b", submit: "",
  });
  expect(get).toHaveBeenCalledTimes(1);
});

test("verification pages cannot produce a credential POST or false login success", async () => {
  vi.mocked(get).mockResolvedValue(response("<h1>Verify</h1>"));
  await expect(Login("viewer", "secret")).rejects.toThrow("xác minh");
  expect(post).not.toHaveBeenCalled();
});

test("source rejection stays a failed login", async () => {
  vi.mocked(get).mockResolvedValueOnce(response('<input name="_csrf" value="token">')).mockResolvedValueOnce(response(signedOut));
  vi.mocked(post).mockResolvedValue(response('<form id="SignInForm"></form>'));
  await expect(Login("viewer", "wrong")).rejects.toThrow("Sai tài khoản");
});

test("an existing source login is accepted without posting credentials", async () => {
  vi.mocked(get).mockResolvedValue(response(signedIn));
  expect((await Login("viewer", "secret")).id).toBe(12);
  expect(post).not.toHaveBeenCalled();
});

test("empty credentials never reach the source", async () => {
  await expect(Login(" ", "secret")).rejects.toThrow("Vui lòng nhập");
  expect(get).not.toHaveBeenCalled();
});

test("session discovery distinguishes signed out from an upstream challenge", async () => {
  vi.mocked(get).mockResolvedValueOnce(response(signedOut)).mockResolvedValueOnce(response("<h1>Cloudflare</h1>"));
  expect(await Me()).toBeNull();
  await expect(Me()).rejects.toThrow("chưa xác nhận");
});

test("incomplete user markers are not a signed-in identity", () => {
  expect(parseUser('isLogin: true, userName: "viewer"')).toBeNull();
  expect(parseUser("isLogin: true, userId: 12")).toBeNull();
});

test("logout must succeed at the source and leave the session signed out", async () => {
  vi.mocked(get).mockResolvedValueOnce(response("")).mockResolvedValueOnce(response(signedIn));
  await expect(Logout()).rejects.toThrow("chưa đăng xuất");
  vi.mocked(get).mockRejectedValueOnce(new Error("Network"));
  await expect(Logout()).rejects.toThrow("Network");
  vi.mocked(get).mockResolvedValueOnce(response("")).mockResolvedValueOnce(response(signedOut));
  await expect(Logout()).resolves.toBeUndefined();
});
