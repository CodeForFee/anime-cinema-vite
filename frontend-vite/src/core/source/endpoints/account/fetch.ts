// The signed-in viewer's account on the source, as its /account/info/ page drives it (/ajax/user/*).
// Every password goes out as md5, like the source's own forms.
import { parse } from "@/core/configure";
import type { Social } from "@/core/source/endpoints/account/parse";
import { md5 } from "@/core/source/md5";
import { get, post } from "@/core/source/transport";

interface Answer {
  success?: boolean;
  error?: string;
  errors?: Record<string, string>;
  message?: string;
}

async function json<T>(request: Promise<{ data: string }>): Promise<Answer & T> {
  const answer = JSON.parse((await request).data) as Answer & T;
  if (!answer.success)
    throw new Error(
      answer.error || Object.values(answer.errors ?? {})[0] || answer.message || "Nguồn từ chối yêu cầu",
    );
  return answer;
}

/** Fresh every time: it changes with each save */
export const AccountInfo = async () => parse("account", (await get("/account/info/")).data);

export const UpdateProfile = (profile: {
  fullname: string;
  gender: string;
  bio: string;
  social: Record<Social, string>;
  genres: string[];
  isPrivate: boolean;
}) =>
  json(
    post("/ajax/user/update-profile", {
      fullname: profile.fullname,
      gender: profile.gender,
      bio: profile.bio,
      ...profile.social,
      favorite_genres: profile.genres.join(","),
      is_private: profile.isPrivate ? "1" : "0",
    }),
  );

export const ChangeUsername = (username: string) =>
  json<{ new_username?: string }>(post("/ajax/user/change-username", { new_username: username }));

export const RequestEmailChange = (email: string, password?: string) =>
  json(
    post("/ajax/user/request-email-change", {
      new_email: email,
      ...(password ? { password_md5: md5(password) } : {}),
    }),
  );

/** Without `current` the source sets a first password (an account made with Google) */
export const ChangePassword = (next: string, confirm: string, current?: string) =>
  json(
    post("/ajax/user/change-password", {
      new_password_md5: md5(next),
      confirm_password_md5: md5(confirm),
      ...(current ? { current_password_md5: md5(current) } : {}),
    }),
  );

export interface MyComment {
  id: number;
  film_id: number;
  film_name?: string;
  film_slug?: string;
  page_label?: string;
  comment_url?: string;
  thread_key: string;
  content: string;
  is_pending: number;
  is_hidden: number;
  hide_reason?: string;
  created_at: number;
}

export const MyComments = async (offset = 0) => {
  const res = await json<{ comments: MyComment[]; has_more: boolean; offset: number }>(
    get(`/ajax/comment?action=get_user_comments&offset=${offset}`),
  );
  return { comments: res.comments, hasMore: res.has_more, offset: res.offset };
};

export interface Notification {
  id?: number;
  type: "approved" | "rejected" | "reply" | "mention" | string;
  from_user_name?: string;
  from_user_fullname?: string;
  film_url?: string;
  is_read: number | string;
  created_at: number;
}

export const Notifications = async () =>
  (await json<{ notifications: Notification[] }>(get("/ajax/comment?action=get_notifications"))).notifications;

export const MarkNotificationsRead = () =>
  post("/ajax/comment", { action: "mark_notifications_read", ids: "all" }).catch(() => undefined);
