import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionRecord } from "@/domain/map/annotations";
import { createProgressRoot } from "@/domain/progress/progressTree";
import { overpassQueueStateForTests } from "../../geo/overpass/requestQueue";
import * as accessControl from "../auth/accessControl";
import { setPremiumApiContext } from "../auth/premiumApiContext";
import * as firebase from "../firebase/firebase";
import * as firebaseAuthReady from "../firebase/firebaseAuthReady";
import { FetchTimeoutError } from "../network/fetchWithTimeout";
import {
  OVERPASS_PROXY_FETCH_TIMEOUT_MS,
  OVERPASS_PROXY_MAX_RETRIES,
  OverpassQueryTooExpensiveError,
  OverpassUnavailableError,
  overpassErrorMessage,
  queryOverpass,
  queueLabel,
} from "./overpassClient";
import { clearOverpassHostCooldownsForTests, isOverpassHostCooled } from "./overpassHostCooldown";

describe("overpass proxy timeout ladder", () => {
  it("proxy attempt timeout outlasts failover plus Postpass", () => {
    expect(OVERPASS_PROXY_FETCH_TIMEOUT_MS).toBeGreaterThanOrEqual(80_000);
    expect(OVERPASS_PROXY_FETCH_TIMEOUT_MS).toBeLessThan(90_000);
  });

  it("proxy allows at most one retry", () => {
    expect(OVERPASS_PROXY_MAX_RETRIES).toBe(1);
  });
});

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
    clearOverpassHostCooldownsForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    clearOverpassHostCooldownsForTests();
  });

  async function runQueuedOverpassTimers(): Promise<void> {
    await vi.runAllTimersAsync();
  }

  it("failovers to the next endpoint on 429 and cools the host", async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (String(url).includes("overpass-api.de")) {
        return {
          ok: false,
          status: 429,
          headers: new Headers(),
          text: async () => "",
        };
      }
      return mockOverpassResponse({ elements: [] });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(queryOverpass<{ elements: unknown[] }>("[out:json];")).resolves.toEqual({
      elements: [],
    });
    expect(
      fetchMock.mock.calls.filter(([url]) => String(url).includes("overpass-api.de")),
    ).toHaveLength(1);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("mail.ru"))).toBe(true);
    expect(isOverpassHostCooled("overpass-api.de")).toBe(true);
  });

  it("throws OverpassQueryTooExpensiveError on the first 504", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 504,
      headers: new Headers(),
      text: async () => "",
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(queryOverpass("[out:json];")).rejects.toBeInstanceOf(
      OverpassQueryTooExpensiveError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("first 504 throws OverpassQueryTooExpensiveError, no endpoint failover", async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
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

    await expect(queryOverpass("[out:json];")).rejects.toBeInstanceOf(
      OverpassQueryTooExpensiveError,
    );
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("mail.ru"))).toBe(false);
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

    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("mail.ru"))).toBe(true);
  });

  it("first fetch timeout throws OverpassQueryTooExpensiveError, no endpoint failover", async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("overpass-api.de")) {
        throw new FetchTimeoutError(15_000);
      }

      return mockOverpassResponse({ elements: [] });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(queryOverpass("[out:json];")).rejects.toBeInstanceOf(
      OverpassQueryTooExpensiveError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("mail.ru"))).toBe(false);
  });

  it("throws OverpassQueryTooExpensiveError on fetch timeout", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => {
      throw new FetchTimeoutError(15_000);
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(queryOverpass("[out:json];")).rejects.toBeInstanceOf(
      OverpassQueryTooExpensiveError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("routes Overpass requests through the configured proxy", async () => {
    vi.stubEnv("VITE_OVERPASS_PROXY_URL", "https://proxy.example/overpass");
    setPremiumApiContext(premiumSession());
    vi.spyOn(accessControl, "buildPremiumProxyHeaders").mockResolvedValue({
      Authorization: "Bearer test-token",
      "X-Session-Id": "session-premium",
    });

    const fetchMock = vi.fn().mockResolvedValue(mockOverpassResponse({ elements: [] }));
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
    vi.spyOn(accessControl, "buildPremiumProxyHeaders").mockImplementation(async () => {
      authAttempts += 1;
      if (authAttempts === 1) {
        return {} as Record<string, string>;
      }

      return {
        Authorization: "Bearer test-token",
        "X-Session-Id": "session-premium",
      };
    });

    const fetchMock = vi.fn().mockResolvedValue(mockOverpassResponse({ elements: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await queryOverpass<{ elements: unknown[] }>("[out:json];");

    expect(waitForAuth).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith("https://proxy.example/overpass", expect.any(Object));
  });

  it("uses public Overpass when the proxy URL is not configured", async () => {
    vi.stubEnv("VITE_OVERPASS_PROXY_URL", "");
    vi.spyOn(accessControl, "buildPremiumProxyHeaders").mockResolvedValue({
      Authorization: "Bearer test-token",
    });

    const fetchMock = vi.fn().mockResolvedValue(mockOverpassResponse({ elements: [] }));
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
    const assertion = expect(resultPromise).rejects.toBeInstanceOf(OverpassUnavailableError);
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

    const fetchMock = vi.fn().mockResolvedValue(mockOverpassResponse({ elements: [] }));
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

  it("force-refreshes the token and rebuilds proxy headers for the 401 retry", async () => {
    vi.stubEnv("VITE_OVERPASS_PROXY_URL", "https://proxy.example/overpass");
    setPremiumApiContext(premiumSession());
    const retryHeaders = {
      Authorization: "Bearer fresh-uid-token",
      "X-Session-Id": "session-premium",
      "X-Firebase-AppCheck": "retry-app-check",
    };
    const buildHeaders = vi
      .spyOn(accessControl, "buildPremiumProxyHeaders")
      .mockResolvedValueOnce({
        Authorization: "Bearer stale-token",
        "X-Session-Id": "session-premium",
      })
      .mockResolvedValueOnce(retryHeaders);
    const getIdToken = vi.fn().mockResolvedValue("fresh-token");
    vi.spyOn(firebase, "getFirebaseAuth").mockReturnValue({
      currentUser: { getIdToken },
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

    await expect(queryOverpass<{ elements: unknown[] }>("[out:json];")).resolves.toEqual({
      elements: [{ id: 1 }],
    });

    expect(getIdToken).toHaveBeenCalledWith(true);
    expect(buildHeaders).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[1]?.headers).toMatchObject(retryHeaders);
  });

  it("throws immediately for other failed responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers(),
      text: async () => "",
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(queryOverpass("[out:json];")).rejects.toThrow("Overpass query failed.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a cancel during fetch with AbortError, without retry or split error", async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn().mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = queryOverpass("[out:json];", { signal: controller.signal });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    controller.abort(new DOMException("Cancelled.", "AbortError"));

    await expect(result).rejects.toMatchObject({ name: "AbortError" });
    await expect(result).rejects.not.toBeInstanceOf(OverpassQueryTooExpensiveError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(overpassQueueStateForTests()).toEqual({ active: 0, waiting: 0 });
  });

  it("ends a backoff sleep immediately on cancel", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);

    const result = queryOverpass("[out:json];", { signal: controller.signal });
    const settled = expect(result).rejects.toMatchObject({ name: "AbortError" });
    await vi.advanceTimersByTimeAsync(1);
    controller.abort(new DOMException("Cancelled.", "AbortError"));
    await settled;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("drives a progress node: started on slot, finished on success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockOverpassResponse({ elements: [] })));
    let now = 0;
    const root = createProgressRoot("Task", { now: () => now++, expectedMs: () => 1_000 });
    const node = root.stage({ kind: "fetch", label: "Searching map data", historyKey: "x" });
    await queryOverpass("[out:json];", { node });
    expect(node.isFinished).toBe(true);
  });

  it("maps OverpassUnavailableError to a user-facing message", () => {
    expect(overpassErrorMessage(new OverpassUnavailableError())).toBe(
      "Map data didn't load. Check your connection and try again.",
    );
  });
});

describe("queryOverpass labels", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    clearOverpassHostCooldownsForTests();
  });

  it("counts queue position as requests ahead", () => {
    expect(queueLabel(0)).toBe("Waiting for map server (next)");
    expect(queueLabel(1)).toBe("Waiting for map server (1 ahead)");
    expect(queueLabel(3)).toBe("Waiting for map server (3 ahead)");
  });

  it("restores the stage label after a retry then failure, so a split never says retrying", async () => {
    vi.useFakeTimers();
    vi.stubEnv("VITE_OVERPASS_PROXY_URL", "");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 502,
          headers: new Headers(),
          text: async () => "",
        })
        .mockResolvedValue({
          ok: false,
          status: 504,
          headers: new Headers(),
          text: async () => "",
        }),
    );
    const root = createProgressRoot("Task", { now: () => 0, expectedMs: () => 1_000 });
    const node = root.stage({ kind: "fetch", label: "Searching map data", historyKey: "x" });
    node.setLabel("Searching map data (part 2 of 4)");

    const result = queryOverpass("[out:json];", { node });
    const settled = expect(result).rejects.toBeInstanceOf(OverpassQueryTooExpensiveError);
    await vi.runAllTimersAsync();
    await settled;
    expect(node.label).toBe("Searching map data (part 2 of 4)");
    vi.useRealTimers();
  });
});
