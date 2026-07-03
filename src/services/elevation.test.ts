import { afterEach, describe, expect, it, vi } from "vitest";
import type { LatLngTuple } from "../domain/geometry";
import { clearElevationCacheForTests, fetchElevations } from "./elevation";

const dublinPoint: LatLngTuple = [53.29602, -6.139977];

function mockElevationResponse(elevations: number[]) {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    json: async () => ({ elevation: elevations }),
  };
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
});
