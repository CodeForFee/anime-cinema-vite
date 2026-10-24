import type { HlsConfig, LoadPolicy } from "hls.js";

// Retried with growing pauses (1, 2, 4, 8 s) instead of failing on the first lost fragment
const RETRY: LoadPolicy = {
  default: {
    maxTimeToFirstByteMs: 10_000,
    maxLoadTimeMs: 60_000,
    timeoutRetry: {
      maxNumRetry: 4,
      retryDelayMs: 1_000,
      maxRetryDelayMs: 8_000,
      backoff: "exponential",
    },
    errorRetry: {
      maxNumRetry: 6,
      retryDelayMs: 1_000,
      maxRetryDelayMs: 8_000,
      backoff: "exponential",
    },
  },
};

/**
 * hls.js settings for streaming on a weak network: the first level is picked from the browser's bandwidth
 * estimate (not a blind 500 kbps guess), no level taller than the player, a minute buffered ahead so a dip
 * does not stall, half a minute kept behind for small rewinds, and loads retried with backoff.
 */
export function weakNetworkConfig(
  downlink: number | undefined,
): Partial<HlsConfig> {
  return {
    ...(downlink ? { abrEwmaDefaultEstimate: downlink } : {}),
    capLevelToPlayerSize: true,
    maxBufferLength: 60,
    backBufferLength: 30,
    fragLoadPolicy: RETRY,
    playlistLoadPolicy: RETRY,
    manifestLoadPolicy: RETRY,
  };
}
