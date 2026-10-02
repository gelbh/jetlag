import { afterEach, describe, expect, it, vi } from "vitest";
import { markStandaloneShellClass, STANDALONE_SHELL_CLASS } from "./markStandaloneShellClass";

describe("markStandaloneShellClass", () => {
  afterEach(() => {
    document.documentElement.classList.remove(STANDALONE_SHELL_CLASS);
    vi.unstubAllGlobals();
  });

  it("stamps html when navigator.standalone is true (iOS home screen)", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      platform: "iPhone",
      standalone: true,
      maxTouchPoints: 5,
    });

    markStandaloneShellClass();

    expect(document.documentElement.classList.contains(STANDALONE_SHELL_CLASS)).toBe(true);
  });

  it("does not stamp when browser tab (not standalone)", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      platform: "iPhone",
      standalone: false,
      maxTouchPoints: 5,
    });
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return false;
      },
    })) as typeof window.matchMedia;

    markStandaloneShellClass();

    expect(document.documentElement.classList.contains(STANDALONE_SHELL_CLASS)).toBe(false);
  });
});
