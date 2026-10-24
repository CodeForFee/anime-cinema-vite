// The one parser worker of the web app (platform/parse.ts): every page parser of the source runs here, off the
// UI thread. It stays up for the whole session, so cheerio is loaded and compiled once, not per page.
import { type ParserName, parsers } from "@/core/source/endpoints/parsers";

type Job = { id: string; name: ParserName; args: unknown[] };

addEventListener("message", (event: MessageEvent<Job>) => {
  const { id, name, args } = event.data;
  try {
    const parser = parsers[name] as (...input: unknown[]) => unknown;
    postMessage({ id, result: parser(...args) });
  } catch (error) {
    postMessage({
      id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
