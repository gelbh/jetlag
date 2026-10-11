import { afterEach, describe, expect, it, vi } from "vitest";
import { clearLegacyOpsDeskStorage } from "./clearLegacyOpsDeskStorage";

describe("clearLegacyOpsDeskStorage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("removes anonymous and uid-scoped desk keys and keeps unrelated keys", () => {
    localStorage.setItem("jetlag.adminOpsDesk.v1", "{}");
    localStorage.setItem("jetlag.adminOpsDesk.v1:uid-a", "{}");
    localStorage.setItem("jetlag.adminOpsDesk.v1:uid-b", "{}");
    localStorage.setItem("jetlag.adminOpsDesk.v2", "keep");
    localStorage.setItem("jetlag.other", "keep");

    clearLegacyOpsDeskStorage();

    expect(localStorage.getItem("jetlag.adminOpsDesk.v1")).toBeNull();
    expect(localStorage.getItem("jetlag.adminOpsDesk.v1:uid-a")).toBeNull();
    expect(localStorage.getItem("jetlag.adminOpsDesk.v1:uid-b")).toBeNull();
    expect(localStorage.getItem("jetlag.adminOpsDesk.v2")).toBe("keep");
    expect(localStorage.getItem("jetlag.other")).toBe("keep");
  });

  it("does not throw when storage is unavailable", () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });

    expect(() => clearLegacyOpsDeskStorage()).not.toThrow();
  });
});
