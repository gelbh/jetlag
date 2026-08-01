import { describe, expect, it } from "vitest";
import { pickHostPromotee } from "./pickHostPromotee";

describe("pickHostPromotee", () => {
  it("prefers seeker over hider", () => {
    expect(
      pickHostPromotee(
        ["host", "h1", "s1"],
        { host: "seeker", h1: "hider", s1: "seeker" },
        "host",
      ),
    ).toBe("s1");
  });

  it("returns null when alone", () => {
    expect(pickHostPromotee(["host"], { host: "seeker" }, "host")).toBeNull();
  });

  it("lexicographic tie-break among seekers", () => {
    expect(
      pickHostPromotee(
        ["host", "b", "a"],
        { host: "seeker", a: "seeker", b: "seeker" },
        "host",
      ),
    ).toBe("a");
  });
});
