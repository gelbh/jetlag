import { beforeEach, describe, expect, it, vi } from "vitest";
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
  const actual = await vi.importActual<typeof serviceWorkerRefresh>(
    "./serviceWorkerRefresh",
  );
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
      isChunkLoadError(
        new TypeError("'text/html' is not a valid JavaScript MIME type."),
      ),
    ).toBe(true);
  });

  it("matches root module import failures", () => {
    expect(
      isChunkLoadError(new TypeError("Importing a module script failed.")),
    ).toBe(true);
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

  it("reloads off the map even with an active session", () => {
    expect(
      attemptChunkReload({
        session: { id: "session-1" },
        pathname: "/",
        onNeedRefresh,
      }),
    ).toBe(true);

    expect(reload).toHaveBeenCalledOnce();
    expect(onNeedRefresh).not.toHaveBeenCalled();
    expect(hasChunkReloadBeenAttempted()).toBe(true);
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

  it("reloads after leaving the map when a chunk reload was deferred", () => {
    sessionStorage.setItem("jetlag:chunk-deferred", "1");

    expect(
      tryApplyDeferredChunkReload({
        session: { id: "session-1" },
        pathname: "/",
        onNeedRefresh,
      }),
    ).toBe(true);

    expect(reload).toHaveBeenCalledOnce();
    expect(wasChunkReloadDeferred()).toBe(false);
  });

  it("does nothing while still on the map", () => {
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
