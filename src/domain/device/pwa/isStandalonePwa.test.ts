import { describe, expect, it } from "vitest";
import { isStandalonePwa } from "./isStandalonePwa";

describe("isStandalonePwa", () => {
  it("returns false when display-mode is browser", () => {
    expect(isStandalonePwa()).toBe(false);
  });
});
