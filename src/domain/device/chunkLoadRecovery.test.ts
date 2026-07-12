import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  attemptChunkReload,
  clearChunkReloadFlag,
  hasChunkReloadBeenAttempted,
  isChunkLoadError,
  wasChunkReloadDeferred,
} from "./chunkLoadRecovery";

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
