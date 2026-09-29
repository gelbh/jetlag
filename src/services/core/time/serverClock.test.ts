import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  probeServerTime,
  recordClockSample,
  resetServerClockForTests,
  serverNow,
  serverNowIso,
} from "./serverClock";

const SKEW_MS = 300_000;

describe("serverClock", () => {
  beforeEach(() => {
    localStorage.clear();
    resetServerClockForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("applies the probed server offset to serverNow", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(null, {
          status: 204,
          headers: { "x-server-time": String(Date.now() + SKEW_MS) },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(probeServerTime()).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/time",
      expect.objectContaining({ method: "HEAD", cache: "no-store" }),
    );
    expect(Math.abs(serverNow() - (Date.now() + SKEW_MS))).toBeLessThan(50);
    expect(localStorage.getItem("jetlag:server-clock-offset")).not.toBeNull();
  });

  it("reports ok without a sample when the header is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 204 })),
    );

    await expect(probeServerTime()).resolves.toEqual({ ok: true });
    expect(Math.abs(serverNow() - Date.now())).toBeLessThan(50);
  });

  it("reports not ok on network failure and keeps the offset", async () => {
    recordClockSample({ sentAtMs: 0, receivedAtMs: 10, serverMs: 1_005 });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("offline");
      }),
    );

    await expect(probeServerTime()).resolves.toEqual({ ok: false });
    expect(Math.abs(serverNow() - (Date.now() + 1_000))).toBeLessThan(50);
  });

  it("reports not ok on server error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 503 })),
    );

    await expect(probeServerTime()).resolves.toEqual({ ok: false });
  });

  it("restores the persisted offset on startup", () => {
    localStorage.setItem(
      "jetlag:server-clock-offset",
      JSON.stringify({ offsetMs: 60_000, savedAtMs: Date.now() - 1_000 }),
    );
    resetServerClockForTests();
    expect(Math.abs(serverNow() - (Date.now() + 60_000))).toBeLessThan(50);
  });

  it.each([
    ["garbage", "not json"],
    ["legacy number", "60000"],
    [
      "implausible",
      JSON.stringify({
        offsetMs: 3 * 24 * 60 * 60 * 1000,
        savedAtMs: Date.now(),
      }),
    ],
    [
      "stale",
      JSON.stringify({
        offsetMs: 60_000,
        savedAtMs: Date.now() - 4 * 24 * 60 * 60 * 1000,
      }),
    ],
    [
      "saved in the future",
      JSON.stringify({
        offsetMs: 60_000,
        savedAtMs: Date.now() + 60 * 60 * 1000,
      }),
    ],
  ])("ignores a %s persisted offset", (_label, raw) => {
    localStorage.setItem("jetlag:server-clock-offset", raw);
    resetServerClockForTests();
    expect(Math.abs(serverNow() - Date.now())).toBeLessThan(50);
  });

  it("drops older samples after a device clock jump", () => {
    const t = Date.now();
    // Fast sample: offset 10_000, rtt 20.
    recordClockSample({
      sentAtMs: t,
      receivedAtMs: t + 20,
      serverMs: t + 10_010,
    });
    // Device clock corrected by +10s: slower sample now implies offset ~0.
    recordClockSample({
      sentAtMs: t + 10_000,
      receivedAtMs: t + 10_400,
      serverMs: t + 10_200,
    });
    expect(Math.abs(serverNow() - Date.now())).toBeLessThan(50);
  });

  it("rejects a sample implying implausible skew", () => {
    const t = Date.now();
    recordClockSample({
      sentAtMs: t,
      receivedAtMs: t,
      serverMs: t + 2 * 24 * 60 * 60 * 1000,
    });
    expect(Math.abs(serverNow() - Date.now())).toBeLessThan(50);
  });

  it("formats serverNowIso from serverNow", () => {
    recordClockSample({ sentAtMs: 0, receivedAtMs: 0, serverMs: 0 });
    expect(Number.isNaN(Date.parse(serverNowIso()))).toBe(false);
  });
});
