import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { deflateRawSync, inflateRawSync } from "node:zlib";
import { CookieJar } from "tough-cookie";
import { GatewayError, gatewayError } from "./upstream.js";

const NAME = "avs-source-session";
const MAX_AGE = 3600;
const AAD = Buffer.from("capynime-source-session:v1");

/** A viewer's upstream cookies, never a shared server jar or the application's Cookie header. */
export class SourceSession {
  private jar = new CookieJar();
  private dirty = false;
  private invalid = false;
  private readonly key: Buffer;
  private readonly secure: boolean;

  constructor(request: Request) {
    const secret = process.env.AVS_SESSION_KEY;
    if (!secret || !/^[a-f\d]{64}$/i.test(secret))
      throw new GatewayError(
        503,
        "SESSION_NOT_CONFIGURED",
        "Phiên nguồn chưa sẵn sàng",
      );
    this.key = Buffer.from(secret, "hex");
    this.secure = new URL(request.url).protocol === "https:";
    const cookie = (request.headers.get("cookie") ?? "")
      .split(";")
      .map((value) => value.trim())
      .find((value) => value.startsWith(`${NAME}=`))
      ?.slice(NAME.length + 1);
    if (!cookie) return;
    try {
      if (!cookie.startsWith("v1.") || cookie.length > 3500)
        throw new Error("invalid session");
      const bytes = Buffer.from(cookie.slice(3), "base64url");
      if (bytes.length < 29) throw new Error("invalid session");
      const decipher = createDecipheriv(
        "aes-256-gcm",
        this.key,
        bytes.subarray(0, 12),
      );
      decipher.setAuthTag(bytes.subarray(12, 28));
      decipher.setAAD(AAD);
      const payload = Buffer.concat([
        decipher.update(bytes.subarray(28)),
        decipher.final(),
      ]);
      const data = JSON.parse(
        inflateRawSync(payload, { maxOutputLength: 32 * 1024 }).toString(
          "utf8",
        ),
      );
      if (typeof data.expiresAt !== "number" || data.expiresAt <= Date.now())
        throw new Error("expired session");
      this.jar = CookieJar.deserializeSync(data.jar);
    } catch {
      // An expired, corrupted or old-key token starts an anonymous session; it never supplies plaintext cookies.
      this.invalid = true;
    }
  }

  cookies(url: URL): string {
    return this.jar.getCookieStringSync(url.href, {
      sameSiteContext: "strict",
    });
  }

  capture(response: Response, url: URL) {
    for (const value of response.headers.getSetCookie()) {
      const cookie = this.jar.setCookieSync(value, url.href, {
        ignoreError: true,
      });
      if (cookie) this.dirty = true;
    }
  }

  finish(response: Response): Response {
    if (!this.dirty && !this.invalid) return response;
    let value = "";
    if (this.dirty) {
      const data = JSON.stringify({
        expiresAt: Date.now() + MAX_AGE * 1000,
        jar: this.jar.serializeSync(),
      });
      if (Buffer.byteLength(data) > 32 * 1024)
        throw new GatewayError(
          502,
          "SESSION_TOO_LARGE",
          "Phiên nguồn vượt giới hạn",
        );
      const nonce = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", this.key, nonce);
      cipher.setAAD(AAD);
      const ciphertext = Buffer.concat([
        cipher.update(deflateRawSync(Buffer.from(data))),
        cipher.final(),
      ]);
      value = `v1.${Buffer.concat([nonce, cipher.getAuthTag(), ciphertext]).toString("base64url")}`;
      if (value.length > 3500)
        throw new GatewayError(
          502,
          "SESSION_TOO_LARGE",
          "Phiên nguồn vượt giới hạn",
        );
    }
    response.headers.append(
      "Set-Cookie",
      `${NAME}=${value}; Path=/api; HttpOnly; SameSite=Lax; Max-Age=${value ? MAX_AGE : 0}${this.secure ? "; Secure" : ""}`,
    );
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}

export function sessionResponse(
  response: Response,
  session: SourceSession | undefined,
): Response {
  try {
    return session?.finish(response) ?? response;
  } catch (error) {
    return gatewayError(error);
  }
}
