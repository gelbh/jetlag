import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  clearOverpassCachesForTests,
  fetchCachedOverpassQuery,
} from "../proxies/overpassProxyCore.mjs";
import {
  createMemoryL2Backend,
  overpassL2CacheKey,
  readOverpassL2,
  setOverpassL2BackendForTests,
  writeOverpassL2,
} from "../proxies/overpassSharedCache.mjs";

describe("overpassSharedCache", () => {
  afterEach(() => {
    setOverpassL2BackendForTests(null);
    clearOverpassCachesForTests();
  });

  it("miss → write → hit", async () => {
    const backend = createMemoryL2Backend();
    setOverpassL2BackendForTests(backend);
    const key = overpassL2CacheKey("[out:json];node(1);out;", "free");

    assert.equal(await readOverpassL2(key), null);
    await writeOverpassL2(key, '{"elements":[]}', "application/json");
    const hit = await readOverpassL2(key);
    assert.equal(hit?.stale, false);
    assert.equal(hit?.text, '{"elements":[]}');
  });

  it("expired entry is stale only when allowExpired", async () => {
    const backend = createMemoryL2Backend();
    setOverpassL2BackendForTests(backend);
    const key = overpassL2CacheKey("q", "premium");
    await writeOverpassL2(key, '{"ok":true}', "application/json");

    const metaRaw = await backend.kvGet(key);
    const meta = JSON.parse(metaRaw);
    meta.expiresAt = Date.now() - 1;
    await backend.kvPut(key, JSON.stringify(meta));

    assert.equal(await readOverpassL2(key), null);
    const stale = await readOverpassL2(key, { allowExpired: true });
    assert.equal(stale?.stale, true);
    assert.equal(stale?.text, '{"ok":true}');
  });

  it("never persists non-2xx metadata", async () => {
    const backend = createMemoryL2Backend();
    setOverpassL2BackendForTests(backend);
    const key = overpassL2CacheKey("x", "free");
    await backend.kvPut(
      key,
      JSON.stringify({
        r2Key: "overpass/x",
        expiresAt: Date.now() + 60_000,
        contentType: "application/json",
        byteLength: 2,
        status: 500,
      }),
    );
    await backend.r2Put("overpass/x", "{}", "application/json");
    assert.equal(await readOverpassL2(key), null);
  });

  it("L2 read error returns null (fall through)", async () => {
    setOverpassL2BackendForTests({
      async kvGet() {
        throw new Error("kv down");
      },
      async kvPut() {},
      async r2Get() {
        return null;
      },
      async r2Put() {},
    });
    assert.equal(await readOverpassL2("free:abc"), null);
  });

  it("fetchCachedOverpassQuery serves L2 after L1 miss", async () => {
    const backend = createMemoryL2Backend();
    setOverpassL2BackendForTests(backend);
    const query = "[out:json];node(99);out;";
    const key = overpassL2CacheKey(query, "free");
    await writeOverpassL2(key, '{"from":"l2"}', "application/json");

    const text = await fetchCachedOverpassQuery(query, "free");
    assert.equal(text, '{"from":"l2"}');

    const text2 = await fetchCachedOverpassQuery(query, "free");
    assert.equal(text2, '{"from":"l2"}');
  });

  it("no-ops when L2 backend is unset", async () => {
    setOverpassL2BackendForTests(null);
    assert.equal(await readOverpassL2("free:missing"), null);
    await writeOverpassL2("free:missing", "{}", "application/json");
    assert.equal(await readOverpassL2("free:missing"), null);
  });
});
