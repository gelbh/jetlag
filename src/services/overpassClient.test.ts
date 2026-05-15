import { afterEach, describe, expect, it, vi } from "vitest";
import { queryOverpass } from "./overpassClient";

function mockOverpassResponse(payload: unknown) {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    text: async () => JSON.stringify(payload),
  };
}

describe("overpassClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("retries gateway timeouts before succeeding", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 504,
        headers: new Headers({ "Retry-After": "0" }),
        text: async () => "",
      })
      .mockResolvedValue(mockOverpassResponse({ elements: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      queryOverpass<{ elements: unknown[] }>("[out:json];"),
    ).resolves.toEqual({ elements: [] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws a timeout message after repeated gateway timeouts", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 504,
      headers: new Headers({ "Retry-After": "0" }),
      text: async () => "",
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(queryOverpass("[out:json];")).rejects.toThrow(
      "Overpass timed out. Try again in a moment.",
    );
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("routes Overpass requests through the configured proxy", async () => {
    vi.stubEnv("VITE_OVERPASS_PROXY_URL", "https://proxy.example/overpass");
    const fetchMock = vi
      .fn()
      .mockResolvedValue(mockOverpassResponse({ elements: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await queryOverpass<{ elements: unknown[] }>("[out:json];");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://proxy.example/overpass",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ query: "[out:json];" }),
      }),
    );
  });

  it("throws immediately for other failed responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers(),
      text: async () => "",
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(queryOverpass("[out:json];")).rejects.toThrow(
      "Overpass query failed.",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
