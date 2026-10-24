import {
  core,
  type SourceRequest,
  type SourceResponse,
} from "@/core/configure";
import { C_URL, HOST_CURL } from "@/core/source/hosts";
import { request } from "@/core/source/request";
import {
  adoptSourceHost,
  isSourceHome,
  resolveSourceHost,
  sourceOrigin,
} from "@/core/source/source-host";

const retryable = (error: unknown) => {
  const status = (error as { status?: number } | null)?.status;
  return status === undefined || status === 0 || status >= 500;
};

async function send(
  method: "get" | "post",
  input: SourceRequest,
): Promise<SourceResponse> {
  if (!core().transport.version)
    throw Object.assign(
      new Error("Không kết nối được nguồn dữ liệu"),
      { transportNotAvailable: true },
    );
  const initialHost = HOST_CURL;
  const isSource = Boolean(sourceOrigin(input.url));
  const run = async (attempt: SourceRequest) => {
    const response = await request(method, attempt);
    if (response.status !== 200 && response.status !== 201) throw response;
    if (isSource) {
      const final = sourceOrigin(response.url);
      if (!final) throw new Error("Untrusted source redirect");
      if (final !== HOST_CURL) {
        // AJAX/detail responses lack home markers; verify the final host's home before adopting.
        const home = isSourceHome(response)
          ? response
          : await request(
              "get",
              { url: `https://${final}/#animevsub-vsub` },
              6_000,
            );
        if (!isSourceHome(home) || sourceOrigin(home.url) !== final)
          throw new Error("Invalid source redirect");
        await adoptSourceHost(final);
      }
    }
    return response;
  };
  try {
    return await run(input);
  } catch (error) {
    if (
      !isSource ||
      !retryable(error) ||
      (typeof navigator !== "undefined" && navigator.onLine === false)
    )
      throw error;
    const next =
      HOST_CURL !== initialHost
        ? HOST_CURL
        : await resolveSourceHost(undefined, initialHost);
    if (!next) throw error;
    const url = new URL(input.url);
    url.host = next;
    return run({ ...input, url: url.href });
  }
}

/** Absolute third-party requests remain untouched; source paths follow the live origin. */
export function get(
  url: string | SourceRequest,
  headers?: Record<string, string>,
) {
  return send(
    "get",
    typeof url === "object"
      ? url
      : {
          url: url.includes("://") ? url : `${C_URL}${url}#animevsub-vsub`,
          headers,
        },
  );
}

export function post(
  url: string,
  data: Record<string, number | string | boolean>,
  headers?: Record<string, string>,
) {
  return send("post", { url: `${C_URL}${url}#animevsub-vsub`, data, headers });
}
