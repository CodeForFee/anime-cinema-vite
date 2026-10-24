// HLS mounting ported from anime-vsub/desktop-web src/components/BrtPlayer.vue (remount()).
import Hls from "hls.js";
import workerHls from "hls.js/dist/hls.worker?url";
import { retryAsync } from "ts-retry";

import type { StreamSource } from "@/core/types/anime";
import { weakNetworkConfig } from "@/features/player/engines/hls/config";
import { decryptSource } from "@/features/player/engines/hls/decode";
import { findInRangeSet } from "@/features/player/engines/hls/find-in-range-set";
import { HlsPatched } from "@/features/player/engines/hls/hls-patched";
import { getSegments } from "@/features/player/engines/hls/resolve-master-manifest";
import { resolveMasterManifestWorker } from "@/features/player/engines/hls/resolve-master-manifest.thread";
import { downlinkEstimate, isConnectedToNetwork } from "@/platform/network";

// Defaults of their settings store (src/stores/settings.ts): resolve the redirects of the next
// PRE_RESOLVE segments ahead of playback, and start the next batch CHECK_END_PRE_LIST before the end.
const PRE_RESOLVE = 30;
const CHECK_END_PRE_LIST = 5;

// Makes the extension set the source Referer and CORS headers on the request (create-rule.ts)
const REFERER_TAG = "#animevsub-vsub_extra";

const isHls = (type: string) =>
  type === "hls" || type === "m3u" || type === "m3u8";

/** Starts playing `source` in `video`. Returns the cleanup function. */
export function mountSource(
  video: HTMLVideoElement,
  source: StreamSource,
  onFatal: (message: string) => void,
) {
  // an encrypted playlist of the source is decrypted first, then played like any other
  if (source.encrypted) {
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    decryptSource(source.file).then(
      (file) => {
        if (!cancelled)
          cleanup = mountSource(
            video,
            { ...source, file, encrypted: false },
            onFatal,
          );
      },
      () => onFatal("Không giải mã được nguồn phát"),
    );
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }

  const { file, type } = source;

  if (!isHls(type) || !Hls.isSupported()) {
    video.src = file;
    return () => {
      video.removeAttribute("src");
      video.load();
    };
  }

  let segments: string[] | null = null;
  const resolved = new Map<string, readonly [string, number]>();
  const resolvingTask = new Set<number>();

  const hls = new HlsPatched(
    {
      ...weakNetworkConfig(downlinkEstimate()),
      workerPath: workerHls,
      progressive: true,
      fetchSetup(context, initParams) {
        context.url += REFERER_TAG;
        return new Request(context.url, initParams);
      },
    },
    (request) => {
      if (!segments) void getSegments(file).then((arr) => (segments = arr));
      if (!segments) return fetch(request);

      const realUrl = request.url.split("#")[0];
      const index = segments.indexOf(realUrl);
      const hit = resolved.get(realUrl);

      if (
        index > -1 &&
        (!hit || PRE_RESOLVE - hit[1] < CHECK_END_PRE_LIST) &&
        !findInRangeSet(resolvingTask, index, PRE_RESOLVE) &&
        !video.paused &&
        document.visibilityState === "visible"
      ) {
        resolvingTask.add(index);
        const all = segments;
        void retryAsync(
          () =>
            resolveMasterManifestWorker(
              all,
              resolved,
              index,
              PRE_RESOLVE + CHECK_END_PRE_LIST,
            ),
          { maxTry: 10, delay: 3_000 },
        ).catch(() => resolvingTask.delete(index));
      }

      if (!hit) return fetch(request);

      return fetch(hit[0], request)
        .then((res) => {
          if (res.status === 403) throw true;
          return res;
        })
        .catch(async (err) => {
          if (
            typeof err === "boolean" ||
            (err instanceof TypeError &&
              err.message === "Failed to fetch" &&
              (await isConnectedToNetwork()))
          ) {
            // the resolved url expired
            resolved.clear();
            resolvingTask.clear();
            return fetch(request);
          }

          throw err;
        });
    },
  );

  hls.loadSource(file);
  hls.attachMedia(video);
  hls.on(
    Hls.Events.MANIFEST_PARSED,
    () => void video.play().catch(() => undefined),
  );

  let needSwapCodec = false;
  let timeoutUnneedSwapCodec: ReturnType<typeof setTimeout> | null = null;
  let networkRetried = false;
  const offline = new AbortController();

  hls.on(Hls.Events.ERROR, (_event, data) => {
    if (!data.fatal) return console.warn("Player error: ", data);

    console.warn("Player fatal: ", data);
    switch (data.type) {
      case Hls.ErrorTypes.NETWORK_ERROR:
        // the connection dropped: pick up where it stopped once it is back, instead of failing
        if (!navigator.onLine) {
          window.addEventListener("online", () => hls.startLoad(), {
            once: true,
            signal: offline.signal,
          });
          break;
        }
        // the load policies already retried with backoff: one more start, then the reload button of the player shell
        if (networkRetried) return onFatal("Lỗi mạng: không tải được video");
        networkRetried = true;
        hls.startLoad();
        break;
      case Hls.ErrorTypes.MEDIA_ERROR: {
        const playing = !video.paused;
        if (timeoutUnneedSwapCodec) clearTimeout(timeoutUnneedSwapCodec);
        timeoutUnneedSwapCodec = null;

        if (needSwapCodec) {
          hls.swapAudioCodec();
          needSwapCodec = false;
        } else {
          needSwapCodec = true;
          timeoutUnneedSwapCodec = setTimeout(() => {
            needSwapCodec = false;
            timeoutUnneedSwapCodec = null;
          }, 1_000);
        }
        hls.recoverMediaError();
        if (playing) void video.play().catch(() => undefined);
        break;
      }
      default:
        onFatal("Đã gặp sự cố khi phát lại");
    }
  });

  return () => {
    if (timeoutUnneedSwapCodec) clearTimeout(timeoutUnneedSwapCodec);
    offline.abort();
    hls.destroy();
  };
}
