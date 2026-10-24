import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createRef } from "react";
import { createRoot } from "react-dom/client";
import { expect, test } from "vitest";
import { useProgressStore } from "@/core/player/progress";
import { usePlayerSession } from "@/features/player/hooks/use-player-session";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

test("retrying a web frame offers the last saved position for the same episode", () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  const iframe = createRef<HTMLIFrameElement>();
  const frame = createRef<HTMLDivElement>();
  const key = "retry-test:episode-1";
  let session: ReturnType<typeof usePlayerSession>;
  function Harness({ channel }: { channel: string }) {
    session = usePlayerSession(
      {
        embedUrl: `/api/player?channel=${channel}`,
        frameChannel: channel,
        progressKey: key,
      },
      { iframe, frame },
    );
    return (
      <div ref={frame}>
        <iframe ref={iframe} title="test player" />
      </div>
    );
  }
  const render = (channel: string) =>
    act(() =>
      root.render(
        <QueryClientProvider client={client}>
          <Harness channel={channel} />
        </QueryClientProvider>,
      ),
    );
  try {
    useProgressStore.getState().save(key, 40, 120);
    render("a".repeat(32));
    expect(session!.offeredAt).toBe(40);
    act(() => session.answerResume(false));
    expect(session!.offeredAt).toBeNull();
    useProgressStore.getState().save(key, 65, 120);
    render("b".repeat(32));
    expect(session!.offeredAt).toBe(65);
    expect(useProgressStore.getState().entries[key].t).toBe(65);
  } finally {
    act(() => root.unmount());
    client.clear();
    host.remove();
    useProgressStore.setState({ entries: {} });
  }
});
