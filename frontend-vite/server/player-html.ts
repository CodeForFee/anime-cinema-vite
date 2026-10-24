import { load } from "cheerio/slim";

/** Scripts remain untrusted; the caller MUST use an opaque-origin sandbox. */
export function playerHtml(
  html: string,
  upstreamUrl: string,
  appOrigin: string,
  channel: string,
) {
  const $ = load(html);
  if (!$("html").length) $.root().wrapInner("<html></html>");
  if (!$("head").length) $("html").prepend("<head></head>");
  $("base").remove();
  $("script[data-avs-channel]").remove();
  const base = $("<base>").attr("href", upstreamUrl);
  const bridge = $("<script></script>").attr({
    src: new URL("/player-bridge.js", appOrigin).href,
    "data-avs-channel": channel,
    "data-avs-parent-origin": appOrigin,
  });
  $("head").prepend(base, bridge);
  return $.html();
}
