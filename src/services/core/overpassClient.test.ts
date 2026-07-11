import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FetchTimeoutError } from "./fetchWithTimeout";
import {
  OverpassUnavailableError,
  overpassErrorMessage,
  queryOverpass,
} from "./overpassClient";
import { setPremiumApiContext } from "./premiumApiContext";
import * as accessControl from "./accessControl";
import * as firebase from "./firebase";
import * as firebaseAuthReady from "./firebaseAuthReady";
import type { SessionRecord } from "../../domain/map/annotations";

function premiumSession(): SessionRecord {
  return {
    id: "session-premium",
    code: "ABCD",
    gameArea: {
      type: "Polygon",
      coordinates: [
        [
          [-6.3, 53.3],
          [-6.2, 53.3],
          [-6.2, 53.4],
          [-6.3, 53.4],
          [-6.3, 53.3],
        ],
      ],
    },
    createdAt: "2026-05-14T00:00:00.000Z",
    memberUids: ["host"],
    tier: "premium",
  };
}

function mockOverpassResponse(payload: unknown) {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    text: async () => JSON.stringify(payload),
  };
}

describe("overpassClient", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_OVERPASS_PROXY_URL", "");
    setPremiumApiContext(null);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  async function runQueuedOverpassTimers(): Promise<void> {
    await vi.runAllTimersAsync();
  }

  it("retries rate limits before succeeding", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
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

  it("throws OverpassUnavailableError after repeated gateway timeouts", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 504,
      headers: new Headers({ "Retry-After": "0" }),
      text: async () => "",
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(queryOverpass("[out:json];")).rejects.toBeInstanceOf(
      OverpassUnavailableError,
    );
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it("failovers to the next endpoint after repeated gateway timeouts", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(async (url: string) => {
        if (url.includes("overpass-api.de")) {
          return {
            ok: false,
            status: 504,
            headers: new Headers({ "Retry-After": "0" }),
            text: async () => "",
          };
        }

        return {
          ok: true,
          status: 200,
          headers: new Headers(),
          text: async () => JSON.stringify({ elements: [] }),
        };
      });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      queryOverpass<{ elements: unknown[] }>("[out:json];"),
    ).resolves.toEqual({ elements: [] });

    expect(
      fetchMock.mock.calls.some(([url]) =>
        String(url).includes("overpass-api.de"),
      ),
    ).toBe(true);
    expect(
      fetchMock.mock.calls.some(([url]) =>
        String(url).includes("mail.ru"),
      ),
    ).toBe(true);
  });

  it("failovers to the next endpoint after network errors", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("mail.ru")) {
        return mockOverpassResponse({ elements: [] });
      }

      throw new TypeError("Failed to fetch");
    });
    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = queryOverpass<{ elements: unknown[] }>("[out:json];");
    await runQueuedOverpassTimers();
    await expect(resultPromise).resolves.toEqual({ elements: [] });

    expect(
      fetchMock.mock.calls.some(([url]) => String(url).includes("mail.ru")),
    ).toBe(true);
  });

  it("failovers to the next endpoint after a fetch timeout", async () => {
    vi.useFakeTimers();
    let firstEndpointAttempts = 0;
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("overpass-api.de")) {
        firstEndpointAttempts += 1;
        throw new FetchTimeoutError(15_000);
      }

      return mockOverpassResponse({ elements: [] });
    });
    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = queryOverpass<{ elements: unknown[] }>("[out:json];");
    await runQueuedOverpassTimers();
    await expect(resultPromise).resolves.toEqual({ elements: [] });

    expect(firstEndpointAttempts).toBe(4);
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain("mail.ru");
  });

  it("throws OverpassUnavailableError after repeated fetch timeouts", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockImplementation(async () => {
      throw new FetchTimeoutError(15_000);
    });
    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = queryOverpass("[out:json];");
    const assertion = expect(resultPromise).rejects.toMatchObject({
      name: "OverpassUnavailableError",
      message:
        "Map data didn't load. Check your connection and try again.",
    });
    await runQueuedOverpassTimers();
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(12);
  });

  it("routes Overpass requests through the configured proxy", async () => {
    vi.stubEnv("VITE_OVERPASS_PROXY_URL", "https://proxy.example/overpass");
    setPremiumApiContext(premiumSession());
    vi.spyOn(accessControl, "buildPremiumProxyHeaders").mockResolvedValue({
      Authorization: "Bearer test-token",
      "X-Session-Id": "session-premium",
    });

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

  it("waits for Firebase auth before falling back to public Overpass", async () => {
    vi.stubEnv("VITE_OVERPASS_PROXY_URL", "https://proxy.example/overpass");
    const waitForAuth = vi
      .spyOn(firebaseAuthReady, "waitForRestoredFirebaseAuth")
      .mockResolvedValue(true);

    let authAttempts = 0;
    vi.spyOn(accessControl, "buildPremiumProxyHeaders").mockImplementation(
      async () => {
        authAttempts += 1;
        if (authAttempts === 1) {
          return {} as Record<string, string>;
        }

        return {
          Authorization: "Bearer test-token",
          "X-Session-Id": "session-premium",
        };
      },
    );

    const fetchMock = vi
      .fn()
      .mockResolvedValue(mockOverpassResponse({ elements: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await queryOverpass<{ elements: unknown[] }>("[out:json];");

    expect(waitForAuth).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://proxy.example/overpass",
      expect.any(Object),
    );
  });

  it("uses public Overpass when the proxy URL is not configured", async () => {
    vi.stubEnv("VITE_OVERPASS_PROXY_URL", "");
    vi.spyOn(accessControl, "buildPremiumProxyHeaders").mockResolvedValue({
      Authorization: "Bearer test-token",
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValue(mockOverpassResponse({ elements: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await queryOverpass<{ elements: unknown[] }>("[out:json];");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("overpass-api.de"),
      expect.any(Object),
    );
  });

  it("retries the proxy after network errors then throws OverpassUnavailableError", async () => {
    vi.useFakeTimers();
    vi.stubEnv("VITE_OVERPASS_PROXY_URL", "https://proxy.example/overpass");
    setPremiumApiContext(premiumSession());
    vi.spyOn(accessControl, "buildPremiumProxyHeaders").mockResolvedValue({
      Authorization: "Bearer test-token",
      "X-Session-Id": "session-premium",
    });
    const fetchMock = vi.fn().mockImplementation(async () => {
      throw new TypeError("Failed to fetch");
    });
    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = queryOverpass("[out:json];");
    const assertion = expect(resultPromise).rejects.toBeInstanceOf(
      OverpassUnavailableError,
    );
    await runQueuedOverpassTimers();
    await assertion;
    expect(fetchMock.mock.calls.length).toBeGreaterThan(1);
  });

  it("uses public Overpass when premium proxy auth is not ready", async () => {
    vi.stubEnv("VITE_OVERPASS_PROXY_URL", "https://proxy.example/overpass");
    setPremiumApiContext(premiumSession());
    vi.spyOn(firebaseAuthReady, "waitForRestoredFirebaseAuth").mockResolvedValue(false);
    vi.spyOn(accessControl, "buildPremiumProxyHeaders").mockResolvedValue({
      "X-Session-Id": "session-premium",
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValue(mockOverpassResponse({ elements: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await queryOverpass<{ elements: unknown[] }>("[out:json];");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("overpass-api.de"),
      expect.any(Object),
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      "https://proxy.example/overpass",
      expect.any(Object),
    );
  });

  it("retries the proxy with a refreshed token after 401", async () => {
    vi.stubEnv("VITE_OVERPASS_PROXY_URL", "https://proxy.example/overpass");
    setPremiumApiContext(premiumSession());
    vi.spyOn(accessControl, "buildPremiumProxyHeaders").mockResolvedValue({
      Authorization: "Bearer stale-token",
      "X-Session-Id": "session-premium",
    });
    vi.spyOn(firebase, "getFirebaseAuth").mockReturnValue({
      currentUser: {
        getIdToken: vi.fn().mockResolvedValue("fresh-token"),
      },
    } as never);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Headers(),
        text: async () => "",
      })
      .mockResolvedValue(mockOverpassResponse({ elements: [{ id: 1 }] }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      queryOverpass<{ elements: unknown[] }>("[out:json];"),
    ).resolves.toEqual({ elements: [{ id: 1 }] });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[1]?.headers?.Authorization).toBe(
      "Bearer fresh-token",
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

  it("maps OverpassUnavailableError to a user-facing message", () => {
    expect(
      overpassErrorMessage(new OverpassUnavailableError()),
    ).toBe(
      "Map data didn't load. Check your connection and try again.",
    );
  });
});
