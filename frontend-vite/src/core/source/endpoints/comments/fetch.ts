// The source's comment thread (/ajax/comment, read by its comment.js) and the viewer's account on the source.
// Requests carry the viewer's source session: browser extension cookies or the app's native cookie jar.
import { load } from "cheerio";
import { md5 } from "@/core/source/md5";
import { get, post } from "@/core/source/transport";

export interface SourceComment {
  id: number;
  parent_id: number;
  episode_id: number;
  /** the episode name it was written under ("03"), or "" / "/" */
  thread_key: string;
  content: string;
  is_spoiler: number;
  votes_up: number;
  votes_down: number;
  /** unix seconds */
  created_at: number;
  is_pinned: number;
  is_global_pinned: number;
  replies_count: number;
  user_fullname: string;
  user_name: string;
  user_avatar: string;
  user_ban: number;
  badges: { name: string; color: string }[];
}

export interface CommentPage {
  comments: SourceComment[];
  total: number;
  hasMore: boolean;
  offset: number;
}

export interface SourceUser {
  id: number;
  name: string;
  avatar: string;
}

interface Answer {
  success?: boolean;
  error?: string;
  message?: string;
}

async function json<T extends Answer>(request: Promise<{ data: string }>) {
  const answer = JSON.parse((await request).data) as T;
  if (!answer.success)
    throw new Error(answer.error || answer.message || "Nguồn từ chối yêu cầu");
  return answer;
}

/** "hotaru-no-yomeiri-a6134" -> 6134 */
export const filmIdOf = (slug: string) => Number(slug.match(/-a(\d+)$/)?.[1] ?? 0);

export async function Comments(filmId: number, offset = 0): Promise<CommentPage> {
  const res = await json<Answer & { comments: SourceComment[]; total: number; has_more: boolean; offset: number }>(
    get(`/ajax/comment?action=get&film_id=${filmId}&sort=newest&offset=${offset}`),
  );
  return { comments: res.comments, total: res.total, hasMore: res.has_more, offset: res.offset };
}

export async function Replies(commentId: number): Promise<SourceComment[]> {
  const res = await json<Answer & { replies: SourceComment[] }>(
    get(`/ajax/comment?action=get_replies&comment_id=${commentId}&sort=newest&offset=0`),
  );
  return res.replies;
}

export async function PostComment(input: {
  filmId: number;
  episodeId?: string | number;
  episodeName?: string;
  content: string;
  spoiler?: boolean;
  parentId?: number;
}) {
  return json<Answer & { comment: SourceComment; pending?: boolean }>(
    post("/ajax/comment", {
      action: "post",
      film_id: input.filmId,
      episode_id: input.episodeId ?? 0,
      content: input.content,
      is_spoiler: input.spoiler ? 1 : 0,
      thread_key: input.episodeName ?? "",
      parent_id: input.parentId ?? 0,
    }),
  );
}

/** Who the source session belongs to: every page's comment box is set up with it (AvsComment.init) */
export function parseUser(html: string): SourceUser | null {
  if (!/isLogin:\s*true/.test(html)) return null;
  const field = (key: string) => {
    const raw = html.match(new RegExp(`${key}:\\s*"((?:[^"\\\\]|\\\\.)*)"`))?.[1] ?? "";
    try {
      return JSON.parse(`"${raw}"`) as string;
    } catch {
      return raw;
    }
  };
  const user = {
    id: Number(html.match(/userId:\s*(\d+)/)?.[1] ?? 0),
    name: field("userFullName") || field("userName"),
    avatar: field("userAvatar"),
  };
  return user.id > 0 && user.name ? user : null;
}

// a light page that still sets up the comment box
const ME_PAGE = "/lich-chieu-phim.html";

/** Cheap check of the browser's source session: the notification bell answers "Not login" when signed out */
export async function SignedIn(): Promise<boolean> {
  const res = JSON.parse((await get("/ajax/notification?notif=true")).data) as { status?: number; html?: string };
  return !(res.status === 0 && res.html === "Not login");
}

export async function Me(): Promise<SourceUser | null> {
  const html = (await get(ME_PAGE)).data;
  const user = parseUser(html);
  if (user) return user;
  // A challenge/error page is not proof that an existing session expired.
  if (/isLogin:\s*false/.test(html) || load(html)("form#SignInForm input[name='password']").length)
    return null;
  throw new Error("Nguồn chưa xác nhận phiên đăng nhập. Hãy mở trang AnimeVietsub để kiểm tra.");
}

/** The source's own "Thoát" link: it expires the session cookies, which the viewer's jar then drops */
export async function Logout() {
  await get("/thoat");
  if (await Me()) throw new Error("Nguồn chưa đăng xuất tài khoản. Vui lòng thử lại.");
}

/** The source's own sign-in form: a CSRF token from the form, then md5(password) like its login.js */
export async function Login(email: string, password: string): Promise<SourceUser> {
  if (!email.trim() || !password) throw new Error("Vui lòng nhập tài khoản và mật khẩu");
  const form = (await get("/account/login/")).data;
  const csrf = load(form)("input[name='_csrf']").attr("value");
  if (!csrf) {
    const already = parseUser(form);
    if (already) return already;
    throw new Error("Nguồn yêu cầu xác minh hoặc không mở được biểu mẫu. Hãy mở trang đăng nhập AnimeVietsub.");
  }
  // signed in, the source redirects to _fxRef: a page that names the user, so no second request
  const res = await post(`/account/login/?_fxRef=${encodeURIComponent(ME_PAGE)}`, {
    email: email.trim(),
    password: "",
    password_md5: md5(password),
    save_password: 1,
    _csrf: csrf,
    submit: "",
  });
  const user = parseUser(res.data) ?? (await Me());
  if (!user) throw new Error("Sai tài khoản hoặc mật khẩu");
  return user;
}
