import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { act, type RefObject } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";
import { usePlayerBridge } from "@/features/player/engines/iframe-bridge";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
const channel = "a".repeat(32);
let root: Root | undefined;
let host: HTMLDivElement;
let frame: RefObject<HTMLIFrameElement | null>;
let bridge: ReturnType<typeof usePlayerBridge>;

function Harness({ token, url }: { token?: string; url: string }) {
  bridge = usePlayerBridge(frame, url, true, token);
  return (
    <iframe
      ref={frame}
      src={url}
      sandbox={token ? "allow-scripts" : undefined}
      title="test player"
    />
  );
}

function mount(token: string | undefined = channel) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  frame = { current: null };
  act(() =>
    root?.render(
      <Harness
        token={token}
        url={
          token
            ? "/api/player"
            : "https://storage.googleapiscdn.com/player/test"
        }
      />,
    ),
  );
}

function message(
  data: Record<string, unknown>,
  source = frame.current?.contentWindow,
  origin = "null",
) {
  act(() =>
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { source: "avs-player-bridge", channel, ...data },
        source,
        origin,
      }),
    ),
  );
}

afterEach(() => {
  if (root) act(() => root?.unmount());
  root = undefined;
  host?.remove();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

test("only the current sandbox window and matching channel can take over controls", () => {
  mount();
  message({ type: "ready", channel: "wrong" });
  message({ type: "ready" }, window);
  message(
    { type: "ready" },
    frame.current?.contentWindow,
    window.location.origin,
  );
  expect(bridge.ready).toBe(false);
  message({ type: "ready" });
  expect(bridge.ready).toBe(true);
  const child = frame.current?.contentWindow;
  expect(child).toBeTruthy();
  const post = vi
    .spyOn(child as Window, "postMessage")
    .mockImplementation(() => {});
  act(() => bridge.send("seek", 42));
  expect(post).toHaveBeenCalledWith(
    { source: "avs-player-app", channel, type: "seek", value: 42 },
    "*",
  );
  expect(frame.current?.getAttribute("sandbox")).toBe("allow-scripts");
});

test("rejects malformed state and bounds a player that never loads metadata", () => {
  vi.useFakeTimers();
  mount();
  message({ type: "ready" });
  message({ type: "state", currentTime: Number.NaN });
  expect(bridge.state).toBeNull();
  act(() => vi.advanceTimersByTime(30_000));
  expect(bridge.failure).toBeTruthy();
  message({
    type: "state",
    currentTime: 10,
    duration: 120,
    paused: false,
    waiting: false,
    rate: 1,
    ended: false,
  });
  expect(bridge.failure).toBeNull();
  expect(bridge.state?.currentTime).toBe(10);
  act(() => root?.unmount());
  root = undefined;
  expect(vi.getTimerCount()).toBe(0);
});

test("native protocol still checks the source origin without requiring a channel", () => {
  mount(undefined);
  // An explicit undefined uses the default in mount; render the native form instead.
  act(() =>
    root?.render(
      <Harness url="https://storage.googleapiscdn.com/player/test" />,
    ),
  );
  message({ type: "ready", channel: undefined });
  expect(bridge.ready).toBe(false);
  message(
    { type: "ready", channel: undefined },
    frame.current?.contentWindow,
    "https://storage.googleapiscdn.com",
  );
  expect(bridge.ready).toBe(true);
});

test("injected bridge authenticates parent commands and controls the frame's video", () => {
  host = document.createElement("div");
  const iframe = document.createElement("iframe");
  host.appendChild(iframe);
  document.body.appendChild(host);
  const child = iframe.contentWindow as Window & typeof globalThis;
  const script = child.document.createElement("script");
  script.dataset.avsChannel = channel;
  script.dataset.avsParentOrigin = window.location.origin;
  Object.defineProperty(child.document, "currentScript", { get: () => script });
  const video = child.document.createElement("video");
  Object.defineProperty(video, "duration", { value: 120 });
  child.document.body.appendChild(video);
  const replies = vi.fn();
  const parent = { postMessage: replies };
  type CommandEvent = { source: unknown; origin: string; data: unknown };
  const listeners = new Map<string, (event: CommandEvent) => void>();
  runInNewContext(readFileSync("public/player-bridge.js", "utf8"), {
    window: {
      top: {},
      parent,
      addEventListener: (
        name: string,
        listener: (event: CommandEvent) => void,
      ) => listeners.set(name, listener),
    },
    location: { hash: "#animevsub-vsub_extra" },
    document: child.document,
    HTMLElement: child.HTMLElement,
    MutationObserver: child.MutationObserver,
    setInterval: vi.fn(),
    setTimeout: vi.fn(),
  });
  const send = (type: string, value?: number, token = channel) =>
    listeners.get("message")?.({
      source: parent,
      origin: window.location.origin,
      data: { source: "avs-player-app", channel: token, type, value },
    });
  try {
    expect(replies).toHaveBeenCalledWith(
      expect.objectContaining({ type: "present", channel }),
      window.location.origin,
    );
    send("hello", undefined, "wrong");
    expect(replies.mock.calls.some(([data]) => data.type === "ready")).toBe(
      false,
    );
    send("hello");
    send("seek", 35);
    send("rate", 1.5);
    send("volume", 0.4);
    expect(video.currentTime).toBe(35);
    expect(video.playbackRate).toBe(1.5);
    expect(video.volume).toBe(0.4);
    send("seek", 60, "wrong");
    expect(video.currentTime).toBe(35);
    expect(replies).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ready", channel }),
      window.location.origin,
    );
  } finally {
    child.close();
  }
});
