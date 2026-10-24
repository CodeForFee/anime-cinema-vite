import type {
  SourceRequest,
  SourceResponse,
  Transport,
} from "@/core/configure";

async function send(
  method: "GET" | "POST",
  input: SourceRequest,
): Promise<SourceResponse> {
  const response = await fetch(
    `/api/proxy?${new URLSearchParams({ url: input.url })}`,
    {
      method,
      headers: {
        Accept: "application/json",
        ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
      },
      body: method === "POST" ? JSON.stringify(input.data ?? {}) : undefined,
      signal: input.signal,
    },
  );
  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw Object.assign(new Error("Không tải được dữ liệu nguồn"), {
      status: response.status || 502,
    });
  }
  if (
    result &&
    typeof result === "object" &&
    "status" in result &&
    typeof result.status === "number" &&
    "url" in result &&
    typeof result.url === "string" &&
    "data" in result &&
    typeof result.data === "string" &&
    "headers" in result &&
    result.headers !== null &&
    typeof result.headers === "object" &&
    !Array.isArray(result.headers) &&
    Object.values(result.headers).every((value) => typeof value === "string")
  )
    return result as SourceResponse;
  const message =
    result &&
    typeof result === "object" &&
    "message" in result &&
    typeof result.message === "string"
      ? result.message
      : "Không kết nối được nguồn";
  throw Object.assign(new Error(message), {
    status: response.status >= 400 ? response.status : 502,
  });
}

export const webTransport: Transport = {
  version: "vercel",
  get: (input) => send("GET", input),
  post: (input) => send("POST", input),
};
