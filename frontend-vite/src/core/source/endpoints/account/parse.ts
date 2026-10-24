import { parserDom } from "@/core/source/html/parserDom";

export const SOCIALS = [
  "social_fb",
  "social_discord",
  "social_youtube",
  "social_mal",
  "social_instagram",
  "social_threads",
  "social_tiktok",
] as const;
export type Social = (typeof SOCIALS)[number];

/** /account/info/: the signed-in viewer's profile form and account rows; null when the source sent the login page */
export default function Account(html: string) {
  const $ = parserDom(html);
  if ($("#upe-panel-hoso").length === 0) return null;
  const val = (selector: string) => $(selector).attr("value") ?? "";

  return {
    name: $(".upe-name").first().text().trim(),
    handle: $(".upe-handle").first().text().trim(),
    joined: $(".upe-joined").first().text().trim(),
    avatar: $("#upe-avatar-img").attr("src") ?? "",
    publicUrl: $(".upe-public-btn").attr("href") ?? "",
    profile: {
      fullname: val("#upe-fullname"),
      gender: $("input[name=gender][checked]").attr("value") ?? "2",
      bio: $("#upe-bio").text(),
      social: Object.fromEntries(SOCIALS.map((key) => [key, val(`input[name=${key}]`)])) as Record<Social, string>,
      isPrivate: $("#upe-private").is("[checked]"),
    },
    genres: $("#upe-chips input[type=checkbox]")
      .map((_i, el) => ({
        id: $(el).attr("value") ?? "",
        name: $(el).parent().text().trim(),
        checked: $(el).is("[checked]"),
      }))
      .toArray(),
    email: $("#upe-current-email").text().trim(),
    emailVerified: $("#upe-panel-taikhoan .upe-badge-ok").length > 0,
    username: $("#upe-current-username").text().trim().replace(/^@/, ""),
    passwordNote: $("#upe-panel-taikhoan .upe-acc-row").eq(2).find(".upe-acc-value").text().trim(),
    /** "set": signed up with Google, no password yet (no current password asked) */
    passwordMode: ($("#upe-submit-password").attr("data-mode") ?? "change") as "set" | "change",
    /** changing the email asks for the password only when the account has one */
    emailNeedsPassword: $("#upe-email-password").length > 0,
    usernameLocked: $("[data-modal=username]").is(".is-disabled, [disabled]"),
  };
}

export type AccountInfo = NonNullable<ReturnType<typeof Account>>;
