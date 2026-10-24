// The source's inline codes: "@[3:Myz0]" mentions and "[sticker:https://…]" images
const CODES = /(@\[\d+:[^\]]+\]|\[sticker:https:\/\/[^\]\s]+\])/g;

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
// the source stores text HTML-escaped ("&quot;"): back to the characters, still rendered as text
const decode = (text: string) =>
  text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (m, e: string) =>
    e[0] === "#"
      ? String.fromCodePoint(Number.parseInt(e.slice(e[1] === "x" || e[1] === "X" ? 2 : 1), e[1] === "x" || e[1] === "X" ? 16 : 10))
      : (ENTITIES[e.toLowerCase()] ?? m),
  );

/** Plain text with mentions and stickers drawn; never HTML */
export function CommentText({ text }: { text: string }) {
  return decode(text).split(CODES).map((part, i) => {
    const mention = part.match(/^@\[\d+:([^\]]+)\]$/);
    if (mention)
      return (
        // biome-ignore lint/suspicious/noArrayIndexKey: parts of one fixed string
        <span key={i} className="font-semibold text-white">
          @{mention[1]}
        </span>
      );
    const sticker = part.match(/^\[sticker:(https:\/\/[^\]\s]+)\]$/);
    if (sticker)
      return (
        // biome-ignore lint/suspicious/noArrayIndexKey: parts of one fixed string
        <img key={i} src={sticker[1]} alt="sticker" loading="lazy" decoding="async" className="my-1.5 block h-20 w-20 object-contain" />
      );
    return part;
  });
}
