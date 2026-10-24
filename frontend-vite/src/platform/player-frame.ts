/** The native shell keeps its own injection; a web frame gets one isolated message channel. */
export function createPlayerFrame(
  embedUrl: string | undefined,
  native: boolean,
) {
  if (!embedUrl) return undefined;
  if (native) return { url: embedUrl, channel: undefined };
  const channel = crypto.randomUUID().replaceAll("-", "");
  const upstream = new URL(embedUrl);
  upstream.hash = "";
  return {
    url: `/api/player?${new URLSearchParams({ url: upstream.href, channel })}#animevsub-vsub_extra`,
    channel,
  };
}
