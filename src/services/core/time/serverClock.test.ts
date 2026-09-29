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
    resetServerClockForTests();
    localStorage.clear();
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

  it("formats serverNowIso from serverNow", () => {
    recordClockSample({ sentAtMs: 0, receivedAtMs: 0, serverMs: 0 });
    expect(Number.isNaN(Date.parse(serverNowIso()))).toBe(false);
  });
});
