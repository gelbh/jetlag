import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { removeBootSplash } from "./bootSplash";

describe("removeBootSplash", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-boot-complete");
    delete document.documentElement.dataset.bootComplete;
  });

  afterEach(() => {
    document.getElementById("boot-splash")?.remove();
    document.documentElement.removeAttribute("data-boot-complete");
    delete document.documentElement.dataset.bootComplete;
  });

  it("removes the boot splash node and marks boot complete", () => {
    const splash = document.createElement("div");
    splash.id = "boot-splash";
    document.body.appendChild(splash);

    removeBootSplash();

    expect(document.getElementById("boot-splash")).toBeNull();
    expect(document.documentElement.dataset.bootComplete).toBe("true");
  });

  it("dispatches boot-complete when splash is already gone", () => {
    const listener = vi.fn();
    document.documentElement.addEventListener("boot-complete", listener);

    removeBootSplash();

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
