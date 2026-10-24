import { playerHtml } from "../server/player-html.js";
import { SourceSession, sessionResponse } from "../server/session.js";
import { GatewayError, gatewayError, upstream } from "../server/upstream.js";

export default {
  async fetch(request: Request): Promise<Response> {
    let session: SourceSession | undefined;
    try {
      if (request.method !== "GET")
        return new Response(null, { status: 405, headers: { Allow: "GET" } });
      const url = new URL(request.url);
      const channel = url.searchParams.get("channel") ?? "";
      if (!/^[a-f0-9]{32}$/.test(channel))
        throw new GatewayError(
          400,
          "INVALID_CHANNEL",
          "Thiếu mã nhận diện player",
        );
      session = new SourceSession(request);
      const result = await upstream(url.searchParams.get("url"), "player", {
        signal: request.signal,
        clientHeaders: request.headers,
        session,
      });
      if (result.status !== 200)
        return sessionResponse(
          Response.json(
            {
              error: "UPSTREAM_HTTP_ERROR",
              upstreamStatus: result.status,
              message: `Nguồn player từ chối yêu cầu (${result.status})`,
            },
            { status: 502, headers: { "Cache-Control": "no-store" } },
          ),
          session,
        );
      if (
        !/^text\/html\b/i.test(result.headers["content-type"] ?? "") ||
        !/<(?:html|head|body|script)\b/i.test(result.data)
      )
        throw new GatewayError(
          502,
          "INVALID_PLAYER_HTML",
          "Nguồn không trả về trang player",
        );
      return sessionResponse(
        new Response(playerHtml(result.data, result.url, url.origin, channel), {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            // Enforce isolation even if someone opens the endpoint outside our iframe.
            "Content-Security-Policy":
              "sandbox allow-scripts; frame-ancestors 'self'",
            "Referrer-Policy": "no-referrer",
          },
        }),
        session,
      );
    } catch (error) {
      return sessionResponse(gatewayError(error), session);
    }
  },
};
