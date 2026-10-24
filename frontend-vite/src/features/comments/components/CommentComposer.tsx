import { EyeOff, LogIn, MessageSquareText, Send } from "lucide-react";
import { type FormEvent, useState } from "react";

import { FIELD, PRIMARY, useLoginDialog, useSourceUser } from "@/features/account";

/** Signed out: one line and the button that opens the sign-in dialog */
function LoginPrompt() {
  const { setOpen } = useLoginDialog();
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/[0.04] p-3 pl-4 ring-1 ring-white/10">
      <MessageSquareText aria-hidden className="h-5 w-5 shrink-0 text-gray-400" />
      <p className="min-w-0 flex-1 text-sm text-gray-300">Đăng nhập tài khoản AnimeVietsub để bình luận</p>
      <button type="button" onClick={() => setOpen(true)} className={PRIMARY}>
        <LogIn aria-hidden className="h-4 w-4" />
        Đăng nhập
      </button>
    </div>
  );
}

/** The comment box when signed in, the sign-in form otherwise */
export function CommentComposer({
  onSend,
  sending,
  error,
  notice,
}: {
  onSend: (content: string, spoiler: boolean) => Promise<unknown>;
  sending: boolean;
  error?: string;
  notice?: string;
}) {
  const { user } = useSourceUser();
  const [text, setText] = useState("");
  const [spoiler, setSpoiler] = useState(false);

  if (!user) return <LoginPrompt />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    try {
      await onSend(content, spoiler);
      setText("");
      setSpoiler(false);
    } catch {
      // the error shows under the box and the text stays for another try
    }
  };

  return (
    <form onSubmit={submit} className="flex gap-3">
      <img
        src={user.avatar}
        alt=""
        decoding="async"
        className="h-10 w-10 shrink-0 rounded-full bg-white/10 object-cover ring-1 ring-white/15"
      />
      <div className="min-w-0 flex-1 space-y-2.5">
        <textarea
          className={`${FIELD} min-h-[84px] resize-y leading-relaxed`}
          placeholder={`Bình luận với tên ${user.name}...`}
          aria-label="Nội dung bình luận"
          maxLength={2000}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {error && (
          <p role="alert" className="text-xs text-red-400">
            {error}
          </p>
        )}
        {notice && <p className="text-xs text-amber-400">{notice}</p>}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            aria-pressed={spoiler}
            onClick={() => setSpoiler(!spoiler)}
            className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition ${
              spoiler ? "bg-primaryRed/20 text-primaryRed ring-1 ring-primaryRed/40" : "glass-pill text-gray-300"
            }`}
          >
            <EyeOff aria-hidden className="h-3.5 w-3.5" />
            Spoiler
          </button>
          <button type="submit" disabled={sending || !text.trim()} className={PRIMARY}>
            <Send aria-hidden className="h-4 w-4" />
            {sending ? "Đang gửi..." : "Gửi"}
          </button>
        </div>
      </div>
    </form>
  );
}
