import { expect, test } from "vitest";

import { weakNetworkConfig } from "./config";

test("the first level follows the browser's bandwidth estimate when there is one", () => {
  expect(weakNetworkConfig(2_500_000).abrEwmaDefaultEstimate).toBe(2_500_000);
  expect("abrEwmaDefaultEstimate" in weakNetworkConfig(undefined)).toBe(false);
});

test("fragments are retried with backoff and the buffer reaches a minute ahead", () => {
  const config = weakNetworkConfig(undefined);
  expect(config.fragLoadPolicy?.default.errorRetry?.backoff).toBe(
    "exponential",
  );
  expect(config.maxBufferLength).toBe(60);
});
