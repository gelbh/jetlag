import { afterEach, describe, expect, it, vi } from "vitest";
import { siblingCacheFallbackPlugin } from "./siblingCacheFallbackPlugin";

const TILE = "https://tiles.openfreemap.org/planet/20250430_001001_pt/14/8186/5448.pbf";

function stubCaches(entries: Record<string, Record<string, string>>) {
  const open = vi.fn(async (name: string) => ({
    match: async (request: Request) => {
      const body = entries[name]?.[request.url];
      return body === undefined ? undefined : new Response(body);
    },
  }));
  vi.stubGlobal("caches", { open });
  return open;
}

async function use(plugin: ReturnType<typeof siblingCacheFallbackPlugin>, cached?: Response) {
  return plugin.cachedResponseWillBeUsed?.({
    cacheName: "openfreemap-tiles-game-area",
    request: new Request(TILE),
    cachedResponse: cached,
    event: {} as ExtendableEvent,
  });
}

describe("siblingCacheFallbackPlugin", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps an own-cache hit without touching the sibling", async () => {
    const open = stubCaches({});
    const own = new Response("own");
    await expect(use(siblingCacheFallbackPlugin("openfreemap-tiles"), own)).resolves.toBe(own);
    expect(open).not.toHaveBeenCalled();
  });

  it("serves a tile cached in the sibling (e.g. general cache, bbox now set) without network", async () => {
    stubCaches({ "openfreemap-tiles": { [TILE]: "general" } });
    const response = await use(siblingCacheFallbackPlugin("openfreemap-tiles"));
    expect(await response?.text()).toBe("general");
  });

  it("returns null when neither cache has it, or Cache Storage fails", async () => {
    stubCaches({});
    await expect(use(siblingCacheFallbackPlugin("openfreemap-tiles"))).resolves.toBeNull();

    vi.stubGlobal("caches", {
      open: async () => {
        throw new Error("no caches");
      },
    });
    await expect(use(siblingCacheFallbackPlugin("openfreemap-tiles"))).resolves.toBeNull();
  });
});
