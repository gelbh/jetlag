import { describe, expect, it, vi } from "vitest";
import { createGameAreaBboxStore, GAME_AREA_BBOX_STATE_KEY } from "./gameAreaBboxStore";

const BBOX = { south: 51.48, west: -0.15, north: 51.53, east: -0.08 };

function createFakeCache() {
  const entries = new Map<string, string>();
  const cache = {
    match: vi.fn(async (key: string) => {
      const body = entries.get(key);
      return body === undefined ? undefined : new Response(body);
    }),
    put: vi.fn(async (key: string, response: Response) => {
      entries.set(key, await response.text());
    }),
    delete: vi.fn(async (key: string) => entries.delete(key)),
  };
  return { cache: cache as unknown as Cache, entries, spies: cache };
}

describe("createGameAreaBboxStore", () => {
  it("starts empty with nothing persisted", async () => {
    const { cache } = createFakeCache();
    const store = createGameAreaBboxStore(async () => cache);
    await expect(store.get()).resolves.toBeNull();
  });

  it("persists a bbox so a restarted SW (new store) reads it back", async () => {
    const { cache, entries } = createFakeCache();
    await createGameAreaBboxStore(async () => cache).set(BBOX);
    expect(JSON.parse(entries.get(GAME_AREA_BBOX_STATE_KEY) ?? "null")).toEqual(BBOX);

    const restarted = createGameAreaBboxStore(async () => cache);
    await expect(restarted.get()).resolves.toEqual(BBOX);
  });

  it("deletes the persisted bbox on null", async () => {
    const { cache, entries } = createFakeCache();
    const store = createGameAreaBboxStore(async () => cache);
    await store.set(BBOX);
    await store.set(null);
    expect(entries.has(GAME_AREA_BBOX_STATE_KEY)).toBe(false);
    await expect(createGameAreaBboxStore(async () => cache).get()).resolves.toBeNull();
  });

  it("hydrates lazily, once", async () => {
    const { cache, entries, spies } = createFakeCache();
    entries.set(GAME_AREA_BBOX_STATE_KEY, JSON.stringify(BBOX));
    const store = createGameAreaBboxStore(async () => cache);
    expect(spies.match).not.toHaveBeenCalled();
    await Promise.all([store.get(), store.get()]);
    await store.get();
    expect(spies.match).toHaveBeenCalledTimes(1);
  });

  it("ignores corrupt persisted state", async () => {
    const { cache, entries } = createFakeCache();
    entries.set(GAME_AREA_BBOX_STATE_KEY, JSON.stringify({ south: "x" }));
    await expect(createGameAreaBboxStore(async () => cache).get()).resolves.toBeNull();
    entries.set(GAME_AREA_BBOX_STATE_KEY, "{not json");
    await expect(createGameAreaBboxStore(async () => cache).get()).resolves.toBeNull();
  });

  it("lets a message that lands mid-hydration win over stale storage", async () => {
    const { cache, entries } = createFakeCache();
    entries.set(GAME_AREA_BBOX_STATE_KEY, JSON.stringify(BBOX));
    const store = createGameAreaBboxStore(async () => cache);
    const pending = store.get();
    void store.set(null);
    await pending;
    await expect(store.get()).resolves.toBeNull();
  });

  it("keeps routing in memory when Cache Storage is unavailable", async () => {
    const store = createGameAreaBboxStore(async () => {
      throw new Error("no caches");
    });
    await expect(store.set(BBOX)).resolves.toBeUndefined();
    await expect(store.get()).resolves.toEqual(BBOX);
  });
});
