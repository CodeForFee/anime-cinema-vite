import { core, type SourceRequest } from "@/core/configure";

/** Bounds the extension bridge too, so unavailable hosts cannot hang a caller forever. */
export async function request(
  method: "get" | "post",
  input: SourceRequest,
  timeout = 12_000,
) {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      core().transport[method]({
        ...input,
        timeout,
        signal: controller.signal,
      }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Source request timed out")),
          timeout,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}
