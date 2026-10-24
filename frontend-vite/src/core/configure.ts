// What the core needs from the platform it runs on. The app passes it once, before anything else loads
// (src/platform/install.ts, imported first by src/main.tsx). The core itself never touches the DOM, Capacitor,
// the extension or IndexedDB: those live behind these three services.
import type { ParserName, Parsers } from "@/core/source/endpoints/parsers";

export interface SourceRequest {
  url: string;
  timeout?: number;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  data?: Record<string, string | number | boolean>;
}

export interface SourceResponse {
  status: number;
  /** final URL, after redirects */
  url: string;
  data: string;
  headers: Record<string, string>;
}

/** How requests reach the source: from the viewer's own device (extension on the web, native HTTP in the app) */
export interface Transport {
  /** Empty when nothing can reach the source (no extension): requests then fail with a clear message */
  version?: string;
  get(request: SourceRequest): Promise<SourceResponse>;
  post(request: SourceRequest): Promise<SourceResponse>;
  /** The source moved to `origin`: headers the transport adds by itself (the Referer) follow it */
  hostChanged?(origin: string): Promise<void> | void;
}

/** Runs one of the page parsers, off the UI thread where the platform can */
export type Parse = <N extends ParserName>(
  name: N,
  ...args: Parameters<Parsers[N]>
) => Promise<ReturnType<Parsers[N]>>;

/** A small persistent key/value cache (the AniList covers) */
export interface Cache<T> {
  entries(): Promise<[string, T][]>;
  set(key: string, value: T): Promise<void>;
}

export interface CoreServices {
  transport: Transport;
  parse: Parse;
  artCache?: Cache<{ cover?: string; banner?: string; at: number }>;
}

let services: CoreServices | undefined;

export function configureCore(next: CoreServices) {
  services = next;
}

export function core(): CoreServices {
  if (!services)
    throw new Error(
      "configureCore() must run before the core is used (src/platform/install.ts)",
    );
  return services;
}

export const parse: Parse = (name, ...args) => core().parse(name, ...args);
