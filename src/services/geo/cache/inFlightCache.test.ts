import { afterEach, describe, expect, it, vi } from "vitest";
import { createProgressRoot } from "@/domain/progress/progressTree";
import { clearGeographicFeatureCacheForTests, type FetchContext, getOrFetchCached } from "./index";
import { DB_NAME, DB_VERSION, readPersistedEntryIgnoringExpiry, STORE_NAME } from "./indexedDb";

function controllableFetch<T>() {
  let resolve!: (value: T) => void;
  let context!: FetchContext;
  let calls = 0;
  const fetcher = (ctx: FetchContext) => {
    calls += 1;
    context = ctx;
    return new Promise<T>((done, fail) => {
      resolve = done;
      ctx.signal.addEventListener("abort", () => fail(ctx.signal.reason), { once: true });
    });
  };
  return {
    fetcher,
    started: () => vi.waitFor(() => expect(calls).toBe(1)),
    resolve: (value: T) => resolve(value),
    context: () => context,
    calls: () => calls,
  };
}

function cancelError() {
  return new DOMException("Cancelled.", "AbortError");
}

async function writeExpiredPersistedEntry(key: string, value: unknown): Promise<void> {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IDB open failed"));
  });
  const transaction = database.transaction(STORE_NAME, "readwrite");
  transaction.objectStore(STORE_NAME).put({ key, value, expiresAt: Date.now() - 60_000 });
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IDB write failed"));
  });
}

async function flush() {
  for (let index = 0; index < 5; index += 1) {
    await Promise.resolve();
  }
}

describe("getOrFetchCached shared in-flight fetches", () => {
  afterEach(async () => {
    await clearGeographicFeatureCacheForTests();
  });

  it("keeps the fetch alive when one of two subscribers cancels", async () => {
    const fetch = controllableFetch<string[]>();
    const first = new AbortController();
    const second = new AbortController();
    const a = getOrFetchCached("k:share", fetch.fetcher, { signal: first.signal });
    const b = getOrFetchCached("k:share", fetch.fetcher, { signal: second.signal });
    await fetch.started();
    first.abort(cancelError());
    await expect(a).rejects.toMatchObject({ name: "AbortError" });
    expect(fetch.context().signal.aborted).toBe(false);
    fetch.resolve(["x"]);
    await expect(b).resolves.toEqual(["x"]);
    expect(fetch.calls()).toBe(1);
  });

  it("aborts the fetch when every subscriber cancels, and caches nothing", async () => {
    const fetch = controllableFetch<string[]>();
    const first = new AbortController();
    const second = new AbortController();
    const a = getOrFetchCached("k:abort", fetch.fetcher, { signal: first.signal });
    const b = getOrFetchCached("k:abort", fetch.fetcher, { signal: second.signal });
    await fetch.started();
    first.abort(cancelError());
    second.abort(cancelError());
    await expect(a).rejects.toMatchObject({ name: "AbortError" });
    await expect(b).rejects.toMatchObject({ name: "AbortError" });
    expect(fetch.context().signal.aborted).toBe(true);
    await flush();
    expect(await readPersistedEntryIgnoringExpiry("k:abort")).toBeUndefined();
  });

  it("does not serve stale data for a cancelled fetch", async () => {
    await writeExpiredPersistedEntry("k:stale", ["old"]);
    const fetch = controllableFetch<string[]>();
    const controller = new AbortController();
    const result = getOrFetchCached("k:stale", fetch.fetcher, { signal: controller.signal });
    await fetch.started();
    controller.abort(cancelError());
    await expect(result).rejects.toMatchObject({ name: "AbortError" });
  });

  it("keeps a preload subscriber's fetch alive after foreground callers cancel", async () => {
    const fetch = controllableFetch<string[]>();
    const preload = getOrFetchCached("k:pinned", fetch.fetcher, { priority: "background" });
    const controller = new AbortController();
    const user = getOrFetchCached("k:pinned", fetch.fetcher, { signal: controller.signal });
    await fetch.started();
    controller.abort(cancelError());
    await expect(user).rejects.toMatchObject({ name: "AbortError" });
    expect(fetch.context().signal.aborted).toBe(false);
    fetch.resolve(["y"]);
    await expect(preload).resolves.toEqual(["y"]);
  });

  it("promotes the shared fetch while a foreground subscriber is attached", async () => {
    const fetch = controllableFetch<string[]>();
    const preload = getOrFetchCached("k:promote", fetch.fetcher, { priority: "background" });
    await fetch.started();
    expect(fetch.context().priority()).toBe("background");
    const controller = new AbortController();
    const user = getOrFetchCached("k:promote", fetch.fetcher, { signal: controller.signal });
    expect(fetch.context().priority()).toBe("foreground");
    controller.abort(cancelError());
    await expect(user).rejects.toMatchObject({ name: "AbortError" });
    expect(fetch.context().priority()).toBe("background");
    fetch.resolve([]);
    await preload;
  });

  it("keeps the second subscriber's mirror moving after the first cancels", async () => {
    const fetch = controllableFetch<string[]>();
    let now = 0;
    const root = createProgressRoot("Task", { now: () => now, expectedMs: () => 1_000 });
    const firstNode = root.stage({ kind: "fetch", label: "A", historyKey: "a" });
    const secondNode = root.stage({ kind: "fetch", label: "B", historyKey: "b" });
    const first = new AbortController();
    const a = getOrFetchCached("k:mirror", fetch.fetcher, {
      signal: first.signal,
      node: firstNode,
    });
    const b = getOrFetchCached("k:mirror", fetch.fetcher, {
      signal: new AbortController().signal,
      node: secondNode,
    });
    await fetch.started();
    fetch.context().node.setCount(1, 2);
    first.abort(cancelError());
    await expect(a).rejects.toMatchObject({ name: "AbortError" });
    now += 10;
    expect(secondNode.fraction()).toBeCloseTo(0.5);
    fetch.resolve(["z"]);
    await b;
    expect(secondNode.isFinished).toBe(true);
  });

  it("finishes the caller's stage at once on a memory hit", async () => {
    await getOrFetchCached("k:hit", async () => ["v"]);
    const root = createProgressRoot("Task", { now: () => 0, expectedMs: () => 1_000 });
    const node = root.stage({ kind: "fetch", label: "A", historyKey: "a" });
    await expect(getOrFetchCached("k:hit", async () => ["new"], { node })).resolves.toEqual(["v"]);
    expect(node.isFinished).toBe(true);
  });
});
