import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  attemptChunkReload,
  clearChunkReloadFlag,
  hasChunkReloadBeenAttempted,
  isChunkLoadError,
  tryApplyDeferredChunkReload,
  wasChunkReloadDeferred,
} from "./chunkLoadRecovery";
import * as serviceWorkerRefresh from "./serviceWorkerRefresh";

vi.mock("./serviceWorkerRefresh", async () => {
  const actual = await vi.importActual<typeof serviceWorkerRefresh>("./serviceWorkerRefresh");
  return {
    ...actual,
    applyServiceWorkerUpdate: vi.fn().mockResolvedValue(undefined),
  };
});

describe("isChunkLoadError", () => {
  it("matches dynamic import fetch failures", () => {
    expect(
      isChunkLoadError(
        new TypeError(
          "Failed to fetch dynamically imported module: https://jetlag.gelbhart.dev/assets/MapScreen-D97KG3o3.js",
        ),
      ),
    ).toBe(true);
  });

  it("matches HTML MIME type failures", () => {
    expect(
      isChunkLoadError(new TypeError("'text/html' is not a valid JavaScript MIME type.")),
    ).toBe(true);
  });

  it("matches root module import failures", () => {
    expect(isChunkLoadError(new TypeError("Importing a module script failed."))).toBe(true);
  });

  it("returns false for unrelated errors", () => {
    expect(isChunkLoadError(new Error("Map crashed"))).toBe(false);
    expect(isChunkLoadError("network down")).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });
});

describe("attemptChunkReload", () => {
  const reload = vi.fn();
  const onNeedRefresh = vi.fn();

  beforeEach(() => {
    sessionStorage.clear();
    reload.mockReset();
    onNeedRefresh.mockReset();
    vi.mocked(serviceWorkerRefresh.applyServiceWorkerUpdate).mockClear();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload },
    });
  });

  it("reloads once and sets the guard flag", () => {
    expect(attemptChunkReload()).toBe(true);
    expect(reload).toHaveBeenCalledOnce();
    expect(hasChunkReloadBeenAttempted()).toBe(true);
  });

  it("does not reload again while the guard flag is set", () => {
    sessionStorage.setItem("jetlag:chunk-reload", "1");

    expect(attemptChunkReload()).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it("defers reload on the map during an active session", () => {
    expect(
      attemptChunkReload({
        session: { id: "session-1" },
        pathname: "/map",
        onNeedRefresh,
      }),
    ).toBe(false);

    expect(reload).not.toHaveBeenCalled();
    expect(onNeedRefresh).toHaveBeenCalledOnce();
    expect(hasChunkReloadBeenAttempted()).toBe(false);
    expect(wasChunkReloadDeferred()).toBe(true);
  });

  it("defers reload off the map while a session is still active", () => {
    expect(
      attemptChunkReload({
        session: { id: "session-1" },
        pathname: "/",
        onNeedRefresh,
      }),
    ).toBe(false);

    expect(reload).not.toHaveBeenCalled();
    expect(onNeedRefresh).toHaveBeenCalledOnce();
    expect(hasChunkReloadBeenAttempted()).toBe(false);
    expect(wasChunkReloadDeferred()).toBe(true);
  });

  it("activates a waiting service worker before reload when available", () => {
    const applyUpdate = vi.fn().mockResolvedValue(undefined);
    const registration = {
      waiting: { postMessage: vi.fn() },
    } as unknown as ServiceWorkerRegistration;

    expect(
      attemptChunkReload({
        registration,
        applyUpdate,
      }),
    ).toBe(true);

    expect(serviceWorkerRefresh.applyServiceWorkerUpdate).toHaveBeenCalledWith(
      registration,
      applyUpdate,
    );
    expect(reload).not.toHaveBeenCalled();
    expect(hasChunkReloadBeenAttempted()).toBe(true);
  });
});

describe("attemptChunkReload while offline", () => {
  const reload = vi.fn();
  let offline = true;
  const isOffline = () => offline;

  beforeEach(() => {
    sessionStorage.clear();
    reload.mockReset();
    offline = true;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload },
    });
  });

  afterEach(() => {
    // Drain any retry still waiting for the network so it cannot leak into the next test.
    offline = false;
    sessionStorage.setItem("jetlag:chunk-reload", "1");
    window.dispatchEvent(new Event("online"));
    sessionStorage.clear();
  });

  it("defers instead of reloading and records the deferred flag", () => {
    expect(attemptChunkReload({ isOffline })).toBe(false);

    expect(reload).not.toHaveBeenCalled();
    expect(wasChunkReloadDeferred()).toBe(true);
    expect(hasChunkReloadBeenAttempted()).toBe(false);
  });

  it("retries exactly once when the online event fires", () => {
    attemptChunkReload({ isOffline });
    attemptChunkReload({ isOffline });

    offline = false;
    window.dispatchEvent(new Event("online"));
    window.dispatchEvent(new Event("online"));

    expect(reload).toHaveBeenCalledOnce();
    expect(hasChunkReloadBeenAttempted()).toBe(true);
    expect(wasChunkReloadDeferred()).toBe(false);
  });

  it("keeps the in-session deferral when the network returns mid-game", () => {
    const onNeedRefresh = vi.fn();
    attemptChunkReload({
      isOffline,
      session: { id: "session-1" },
      pathname: "/map",
      onNeedRefresh,
    });
    expect(onNeedRefresh).not.toHaveBeenCalled();

    offline = false;
    window.dispatchEvent(new Event("online"));

    expect(reload).not.toHaveBeenCalled();
    expect(onNeedRefresh).toHaveBeenCalledOnce();
    expect(wasChunkReloadDeferred()).toBe(true);
  });

  it("falls back to navigator.onLine when no checker is injected", () => {
    const onLine = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    try {
      expect(attemptChunkReload()).toBe(false);
      expect(reload).not.toHaveBeenCalled();
      expect(wasChunkReloadDeferred()).toBe(true);
    } finally {
      onLine.mockRestore();
    }
  });

  it("reloads immediately when the checker reports online", () => {
    offline = false;

    expect(attemptChunkReload({ isOffline })).toBe(true);
    expect(reload).toHaveBeenCalledOnce();
  });
});

describe("tryApplyDeferredChunkReload", () => {
  const reload = vi.fn();
  const onNeedRefresh = vi.fn();

  beforeEach(() => {
    sessionStorage.clear();
    reload.mockReset();
    onNeedRefresh.mockReset();
    vi.mocked(serviceWorkerRefresh.applyServiceWorkerUpdate).mockClear();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload },
    });
  });

  it("reloads after the session ends when a chunk reload was deferred", () => {
    sessionStorage.setItem("jetlag:chunk-deferred", "1");

    expect(
      tryApplyDeferredChunkReload({
        session: null,
        pathname: "/",
        onNeedRefresh,
      }),
    ).toBe(true);

    expect(reload).toHaveBeenCalledOnce();
    expect(wasChunkReloadDeferred()).toBe(false);
  });

  it("does nothing while a session is still active", () => {
    sessionStorage.setItem("jetlag:chunk-deferred", "1");

    expect(
      tryApplyDeferredChunkReload({
        session: { id: "session-1" },
        pathname: "/map",
        onNeedRefresh,
      }),
    ).toBe(false);

    expect(reload).not.toHaveBeenCalled();
    expect(wasChunkReloadDeferred()).toBe(true);
  });

  it("does nothing when no deferred reload is pending", () => {
    expect(
      tryApplyDeferredChunkReload({
        session: { id: "session-1" },
        pathname: "/",
        onNeedRefresh,
      }),
    ).toBe(false);

    expect(reload).not.toHaveBeenCalled();
  });
});

describe("clearChunkReloadFlag", () => {
  it("clears the guard flag", () => {
    sessionStorage.setItem("jetlag:chunk-reload", "1");

    clearChunkReloadFlag();

    expect(hasChunkReloadBeenAttempted()).toBe(false);
  });

  it("clears the deferred flag", () => {
    sessionStorage.setItem("jetlag:chunk-deferred", "1");

    clearChunkReloadFlag();

    expect(wasChunkReloadDeferred()).toBe(false);
  });
});
