import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LatLngTuple } from "../../domain/geometry/geometry";
import {
  clearElevationCacheForTests,
  fetchElevations,
  isUsElevationPoint,
  openElevationCircuitForTests,
  requestGapMsForBatchSize,
} from "./elevation";

const dublinPoint: LatLngTuple = [53.29602, -6.139977];
const timesSquarePoint: LatLngTuple = [40.758, -73.9855];

function mockElevationResponse(elevations: number[]) {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    json: async () => ({ elevation: elevations }),
  };
}

function mockUsgsResponse(elevation: number) {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    json: async () => ({ value: elevation }),
  };
}

function uniquePoints(count: number): LatLngTuple[] {
  return Array.from({ length: count }, (_, index) => [
    53 + index * 0.001,
    -6 + index * 0.001,
  ]);
}

async function fetchSingleElevation(point: LatLngTuple): Promise<number> {
  const [elevation] = await fetchElevations([point]);
  if (!Number.isFinite(elevation)) {
    throw new Error("Elevation lookup returned no data for that point.");
  }

  return elevation;
}

describe("elevation", () => {
  afterEach(() => {
    clearElevationCacheForTests();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("isUsElevationPoint", () => {
    it("matches continental US, Alaska, Hawaii, and Puerto Rico", () => {
      expect(isUsElevationPoint(timesSquarePoint)).toBe(true);
      expect(isUsElevationPoint([64.2, -149.5])).toBe(true);
      expect(isUsElevationPoint([21.3, -157.8])).toBe(true);
      expect(isUsElevationPoint([18.2, -66.5])).toBe(true);
    });

    it("excludes non-US coordinates", () => {
      expect(isUsElevationPoint(dublinPoint)).toBe(false);
      expect(isUsElevationPoint([51.5074, -0.1278])).toBe(false);
    });
  });

  it("uses USGS EPQS for US coordinates", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("epqs.nationalmap.gov")) {
        return mockUsgsResponse(14.8);
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchSingleElevation(timesSquarePoint)).resolves.toBe(14.8);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("epqs.nationalmap.gov");
  });

  it("falls back to Open-Meteo when USGS lookup fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers(),
        json: async () => ({}),
      })
      .mockResolvedValue(mockElevationResponse([135]));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchSingleElevation(timesSquarePoint)).resolves.toBe(135);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("epqs.nationalmap.gov");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("open-meteo.com");
  });

  it("reuses cached elevations for repeated coordinates", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockElevationResponse([42]));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchSingleElevation(dublinPoint)).resolves.toBe(42);
    await expect(fetchSingleElevation(dublinPoint)).resolves.toBe(42);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries rate-limited elevation lookups", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ "Retry-After": "0" }),
        json: async () => ({}),
      })
      .mockResolvedValue(mockElevationResponse([18]));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchSingleElevation(dublinPoint)).resolves.toBe(18);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("opens a circuit breaker after repeated rate limits in background mode", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers(),
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    const points = uniquePoints(3);
    const elevations = await fetchElevations(points, { profile: "background" });

    expect(elevations.every((value) => Number.isNaN(value))).toBe(true);
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(9);
  });

  it("skips network calls while the circuit breaker is open", async () => {
    openElevationCircuitForTests();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const elevations = await fetchElevations([dublinPoint]);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(Number.isNaN(elevations[0])).toBe(true);
  });

  it("serializes concurrent elevation requests", async () => {
    const order: string[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("53.1")) {
        order.push("first");
        await new Promise((resolve) => {
          setTimeout(resolve, 20);
        });
        return mockElevationResponse([10]);
      }

      order.push("second");
      return mockElevationResponse([20]);
    });
    vi.stubGlobal("fetch", fetchMock);

    const firstPoint: LatLngTuple = [53.1, -6.1];
    const secondPoint: LatLngTuple = [53.2, -6.2];
    const [first, second] = await Promise.all([
      fetchElevations([firstPoint]),
      fetchElevations([secondPoint]),
    ]);

    expect(first).toEqual([10]);
    expect(second).toEqual([20]);
    expect(order).toEqual(["first", "second"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("fetches multi-batch inputs sequentially", async () => {
    vi.useFakeTimers();
    const callOrder: number[] = [];
    const points = uniquePoints(101);
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      const batchSize = url.searchParams.get("latitude")?.split(",").length ?? 0;
      callOrder.push(batchSize);
      return mockElevationResponse(Array.from({ length: batchSize }, () => 42));
    });
    vi.stubGlobal("fetch", fetchMock);

    const pending = fetchElevations(points);
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(requestGapMsForBatchSize(100));
    const elevations = await pending;

    expect(elevations).toHaveLength(101);
    expect(elevations.every((value) => value === 42)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(callOrder).toEqual([100, 1]);
  });

  describe("request throttling", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it("computes weighted gaps from batch size", () => {
      expect(requestGapMsForBatchSize(1)).toBe(250);
      expect(requestGapMsForBatchSize(33)).toBe(4950);
      expect(requestGapMsForBatchSize(100)).toBe(15_000);
    });

    it("waits for the previous batch weight before the next request", async () => {
      const points = uniquePoints(101);
      const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
        const url = new URL(String(input));
        const batchSize = url.searchParams.get("latitude")?.split(",").length ?? 0;
        return mockElevationResponse(Array.from({ length: batchSize }, () => 7));
      });
      vi.stubGlobal("fetch", fetchMock);

      const secondBatchGapMs = requestGapMsForBatchSize(100);
      const pending = fetchElevations(points);
      await vi.advanceTimersByTimeAsync(0);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(secondBatchGapMs - 1);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1);
      await pending;

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});
