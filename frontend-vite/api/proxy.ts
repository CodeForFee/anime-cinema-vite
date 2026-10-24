import { GatewayError, gatewayError, upstream } from "../server/upstream.js";
import { SourceSession, sessionResponse } from "../server/session.js";

export default {
  async fetch(request: Request): Promise<Response> {
    let session: SourceSession | undefined;
    try {
      if (request.method !== "GET" && request.method !== "POST")
        return new Response(null, {
          status: 405,
          headers: { Allow: "GET, POST" },
        });
      let body: string | undefined;
      if (request.method === "POST") {
        const raw = await request.text();
        if (raw.length > 16_384)
          throw new GatewayError(
            413,
            "INVALID_BODY",
            "Dữ liệu gửi lên quá lớn",
          );
        let data: unknown;
        try {
          data = JSON.parse(raw);
        } catch {
          throw new GatewayError(
            400,
            "INVALID_BODY",
            "Dữ liệu gửi lên không hợp lệ",
          );
        }
        if (
          !data ||
          typeof data !== "object" ||
          Array.isArray(data) ||
          Object.values(data).some(
            (value) => !["string", "number", "boolean"].includes(typeof value),
          )
        )
          throw new GatewayError(
            400,
            "INVALID_BODY",
            "Dữ liệu gửi lên không hợp lệ",
          );
        body = new URLSearchParams(
          Object.entries(data).map(([key, value]) => [key, String(value)]),
        ).toString();
      }
      session = new SourceSession(request);
      const result = await upstream(
        new URL(request.url).searchParams.get("url"),
        "source",
        {
          method: request.method,
          body,
          signal: request.signal,
          clientHeaders: request.headers,
          session,
        },
      );
      if (
        result.status === 200 &&
        /<title[^>]*>\s*Just a moment\.{0,3}\s*<\/title>/i.test(result.data) &&
        /cf-chl|challenge-platform/i.test(result.data)
      )
        throw new GatewayError(
          403,
          "UPSTREAM_CHALLENGE",
          "Nguồn yêu cầu xác minh truy cập",
          result.status,
        );
      const payload = JSON.stringify(result);
      if (new TextEncoder().encode(payload).byteLength > 4 * 1024 * 1024)
        throw new GatewayError(
          502,
          "UPSTREAM_TOO_LARGE",
          "Phản hồi nguồn vượt giới hạn",
          result.status,
        );
      return sessionResponse(
        new Response(payload, {
          status: result.status >= 400 ? result.status : 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
          },
        }),
        session,
      );
    } catch (error) {
      return sessionResponse(gatewayError(error), session);
    }
  },
};
