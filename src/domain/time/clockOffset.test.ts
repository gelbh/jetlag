import { describe, expect, it } from "vitest";
import { estimateOffset } from "./clockOffset";

describe("estimateOffset", () => {
  it("uses midpoint of lowest-RTT sample", () => {
    expect(
      estimateOffset([
        { sentAtMs: 0, receivedAtMs: 1000, serverMs: 10_000 }, // rtt 1000
        { sentAtMs: 2000, receivedAtMs: 2100, serverMs: 12_050 }, // rtt 100 → offset 10_000
      ]),
    ).toBe(10_000);
  });

  it("returns null with no samples", () => {
    expect(estimateOffset([])).toBeNull();
  });

  it("ignores samples with rtt > 10s", () => {
    expect(
      estimateOffset([{ sentAtMs: 0, receivedAtMs: 20_000, serverMs: 5 }]),
    ).toBeNull();
  });

  it("ignores samples with negative rtt", () => {
    expect(
      estimateOffset([{ sentAtMs: 100, receivedAtMs: 50, serverMs: 5 }]),
    ).toBeNull();
  });
});
