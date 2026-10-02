import { describe, expect, it } from "vitest";
import { reuseHiderTruthMapIfEqual } from "./hiderTruthMapReuse";
import type { HiderTruthResult } from "./shared";

function truth(replyId: string): HiderTruthResult {
  return { replyId, label: replyId };
}

describe("reuseHiderTruthMapIfEqual", () => {
  it("returns previous Map when entries match", () => {
    const previous = new Map([["a", truth("yes")]]);
    const next = new Map([["a", truth("yes")]]);

    expect(reuseHiderTruthMapIfEqual(previous, next)).toBe(previous);
  });

  it("returns next Map when replyId differs", () => {
    const previous = new Map([["a", truth("yes")]]);
    const next = new Map([["a", truth("no")]]);

    expect(reuseHiderTruthMapIfEqual(previous, next)).toBe(next);
  });

  it("returns next Map when unavailable payload differs", () => {
    const previous = new Map([
      [
        "a",
        {
          replyId: "",
          label: "Truth unavailable. Set your hiding zone first.",
          unavailable: true,
          unavailableReason: "Truth unavailable. Set your hiding zone first.",
        },
      ],
    ]);
    const next = new Map([
      [
        "a",
        {
          replyId: "",
          label: "Truth unavailable. Cannot compute.",
          unavailable: true,
          unavailableReason: "Truth unavailable. Cannot compute.",
        },
      ],
    ]);

    expect(reuseHiderTruthMapIfEqual(previous, next)).toBe(next);
  });
});
