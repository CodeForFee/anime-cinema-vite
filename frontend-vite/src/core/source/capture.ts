// Dev only (main.tsx loads it under import.meta.env.DEV): saves what the source sends for one title's watch
// page and its players, so the server list can be parsed from a real fixture instead of a guess.
// In the dev app with the extension, open the console and run:  await __capyCapture("<slug>")
// It downloads capture-<slug>.json; put it in src/core/source/endpoints/__fixtures__/data/.
import { post } from "@/core/source/transport";
import { page } from "@/core/source/cached";

const SERVERISH = /server|sv|backup|link/i;

async function settle<T>(run: () => Promise<T>) {
  try {
    return { ok: true as const, value: await run() };
  } catch (error) {
    return {
      ok: false as const,
      error: String((error as Error)?.message ?? error),
    };
  }
}

async function capture(slug: string) {
  const watchPath = `/phim/${slug}/xem-phim.html`;
  const watchHtml = await page(watchPath);
  const doc = new DOMParser().parseFromString(watchHtml, "text/html");

  // every element carrying the attributes the source uses to pick a player, and every server-looking block
  const players = [
    ...doc.querySelectorAll("[data-play],[data-hash],[data-href],[data-id]"),
  ]
    .slice(0, 80)
    .map((el) => ({
      tag: el.tagName.toLowerCase(),
      class: el.getAttribute("class"),
      parent: el.parentElement?.getAttribute("class") ?? null,
      text: el.textContent?.trim().slice(0, 60),
      data: { ...(el as HTMLElement).dataset },
      href: el.getAttribute("href"),
    }));
  const serverBlocks = [...doc.querySelectorAll("[id],[class]")]
    .filter((el) => SERVERISH.test(`${el.id} ${el.getAttribute("class")}`))
    .slice(0, 20)
    .map((el) => el.outerHTML.slice(0, 4000));

  const first = doc.querySelector<HTMLElement>(
    "#list-server .list-episode .episode a",
  );
  const episodeHref = first?.getAttribute("href") ?? null;
  const episodeHtml = episodeHref
    ? await settle(() => page(new URL(episodeHref, location.origin).pathname))
    : null;
  const { id = "", play = "", hash = "" } = first?.dataset ?? {};
  const player = await settle(async () =>
    JSON.parse(
      (await post("/ajax/player", { id, play, link: hash, backuplinks: "1" }))
        .data,
    ),
  );
  // the older site answered the server buttons to this form; kept only as evidence, the app does not use it
  const probe = await settle(async () =>
    (await post("/ajax/player", { episodeId: id, backup: "1" })).data.slice(
      0,
      20000,
    ),
  );

  const result = {
    capturedAt: new Date().toISOString(),
    slug,
    watchPath,
    players,
    serverBlocks,
    episode: { id, play, hash, href: episodeHref },
    player,
    probe,
    watchHtml,
    episodeHtml,
  };
  const link = document.createElement("a");
  link.href = URL.createObjectURL(
    new Blob([JSON.stringify(result, null, 2)], { type: "application/json" }),
  );
  link.download = `capture-${slug}.json`;
  link.click();
  return {
    players: players.length,
    serverBlocks: serverBlocks.length,
    player: player.ok,
  };
}

(window as unknown as { __capyCapture: typeof capture }).__capyCapture =
  capture;
