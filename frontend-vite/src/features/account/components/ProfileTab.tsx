import { Camera, Check, Lock } from "lucide-react";
import { type FormEvent, useState } from "react";

import { SOCIALS, type AccountInfo } from "@/core/source/endpoints/account/parse";
import { FIELD, PRIMARY } from "@/features/account/components/LoginForm";
import { C_URL } from "@/core/source/hosts";
import { useSaveProfile } from "@/features/account/hooks/use-account";

const SOCIAL_LABEL: Record<(typeof SOCIALS)[number], string> = {
  social_fb: "https://facebook.com/yourname",
  social_discord: "Discord: username hoặc username#1234",
  social_youtube: "https://youtube.com/@channel",
  social_mal: "https://myanimelist.net/profile/abc",
  social_instagram: "https://instagram.com/yourname",
  social_threads: "https://threads.net/@yourname",
  social_tiktok: "https://tiktok.com/@yourname",
};
const GENDERS = [
  ["1", "Nam"],
  ["0", "Nữ"],
  ["2", "Không xác định"],
] as const;
const LABEL = "mb-2 block text-sm font-semibold text-white";
const chip = (on: boolean) =>
  `rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
    on ? "bg-white text-black" : "glass-pill text-gray-300 hover:text-white"
  }`;

/** Hồ sơ: avatar, display name, gender, bio, socials, up to 10 favourite genres, private profile */
export function ProfileTab({ info }: { info: AccountInfo }) {
  const save = useSaveProfile();
  const [form, setForm] = useState({
    ...info.profile,
    genres: info.genres.filter((g) => g.checked).map((g) => g.id),
  });
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const toggleGenre = (id: string) =>
    set({
      genres: form.genres.includes(id)
        ? form.genres.filter((g) => g !== id)
        : form.genres.length < 10
          ? [...form.genres, id]
          : form.genres,
    });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate(form);
  };

  return (
    <form onSubmit={submit} className="space-y-7">
      {/* the extension carries form fields, not files: the avatar is changed on the source's own page */}
      <div className="flex items-center gap-4">
        <img src={info.avatar} alt="" className="h-20 w-20 shrink-0 rounded-full object-cover ring-2 ring-white/20" />
        <div className="text-sm">
          <a
            href={`${C_URL}/account/info/?tab=hoso`}
            target="_blank"
            rel="noreferrer"
            className="glass-pill inline-flex h-9 items-center gap-2 rounded-full px-4 font-semibold text-gray-100"
          >
            <Camera aria-hidden className="h-4 w-4" /> Đổi ảnh đại diện
          </a>
          <p className="mt-2 text-xs text-gray-500">Mở AnimeVietsub để tải ảnh lên, ảnh mới hiện ở đây sau khi tải lại.</p>
        </div>
      </div>

      <label className="block">
        <span className={LABEL}>Tên hiển thị</span>
        <input className={FIELD} maxLength={50} value={form.fullname} onChange={(e) => set({ fullname: e.target.value })} placeholder="Để trống để dùng @username" />
        <span className="mt-1.5 block text-xs text-gray-500">Hiện ở bình luận và hồ sơ công khai.</span>
      </label>

      <fieldset>
        <legend className={LABEL}>Giới tính</legend>
        <div className="flex flex-wrap gap-2">
          {GENDERS.map(([value, label]) => (
            <button key={value} type="button" aria-pressed={form.gender === value} onClick={() => set({ gender: value })} className={chip(form.gender === value)}>
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className={`${LABEL} flex justify-between`}>
          Giới thiệu <span className="font-normal text-gray-500">{form.bio.length}/280</span>
        </span>
        <textarea className={`${FIELD} min-h-24 resize-y`} maxLength={280} value={form.bio} onChange={(e) => set({ bio: e.target.value })} placeholder="Vài dòng về bạn..." />
      </label>

      <fieldset>
        <legend className={LABEL}>Mạng xã hội</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {SOCIALS.map((key) => (
            <input
              key={key}
              className={FIELD}
              aria-label={SOCIAL_LABEL[key]}
              placeholder={SOCIAL_LABEL[key]}
              value={form.social[key]}
              onChange={(e) => set({ social: { ...form.social, [key]: e.target.value } })}
            />
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className={LABEL}>
          Thể loại yêu thích <span className="font-normal text-gray-500">({form.genres.length}/10)</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {info.genres.map((g) => (
            <button key={g.id} type="button" aria-pressed={form.genres.includes(g.id)} onClick={() => toggleGenre(g.id)} className={chip(form.genres.includes(g.id))}>
              {g.name}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/10">
        <span>
          <span className="flex items-center gap-2 text-sm font-semibold text-white">
            <Lock aria-hidden className="h-4 w-4 text-primaryRed" /> Khoá trang cá nhân
          </span>
          <span className="mt-1 block text-xs text-gray-400">Khi bật: chỉ bạn (và admin) thấy hồ sơ đầy đủ.</span>
        </span>
        <input type="checkbox" className="peer sr-only" checked={form.isPrivate} onChange={(e) => set({ isPrivate: e.target.checked })} />
        <span aria-hidden className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-white/15 transition peer-checked:bg-primaryRed after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
      </label>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={save.isPending} className={PRIMARY}>
          <Check aria-hidden className="h-4 w-4" />
          {save.isPending ? "Đang lưu..." : "Lưu hồ sơ"}
        </button>
        {save.isSuccess && <span className="text-sm text-emerald-400">Đã lưu</span>}
        {save.error && <span role="alert" className="text-sm text-red-400">{save.error.message}</span>}
      </div>
    </form>
  );
}
