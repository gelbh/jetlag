import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EMBED_SESSION_KEY,
  isEmbedMode,
  markEmbedShellAttribute,
  resetEmbedModeForTests,
} from "./embedMode";

function setFramed(framed: boolean): void {
  vi.spyOn(window, "top", "get").mockReturnValue(
    framed ? ({} as Window) : window
  );
}

function setSearch(search: string): void {
  window.history.replaceState(null, "", `/${search}`);
}

describe("embedMode", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    setSearch("");
    delete document.documentElement.dataset.embed;
    resetEmbedModeForTests();
  });

  it("is off for a top-level visit even with ?embed=1", () => {
    setFramed(false);
    setSearch("?embed=1");
    expect(isEmbedMode()).toBe(false);
  });

  it("is off in a frame without the param", () => {
    setFramed(true);
    expect(isEmbedMode()).toBe(false);
  });

  it("turns on in a frame with ?embed=1 and survives a reload without it", () => {
    setFramed(true);
    setSearch("?embed=1");
    expect(isEmbedMode()).toBe(true);
    expect(sessionStorage.getItem(EMBED_SESSION_KEY)).toBe("1");

    resetEmbedModeForTests();
    setSearch("");
    expect(isEmbedMode()).toBe(true);
  });

  it("stamps the html element only in embed mode", () => {
    setFramed(false);
    markEmbedShellAttribute();
    expect(document.documentElement.dataset.embed).toBeUndefined();

    resetEmbedModeForTests();
    setFramed(true);
    setSearch("?embed=1");
    markEmbedShellAttribute();
    expect(document.documentElement.dataset.embed).toBe("iphone");
  });
});
