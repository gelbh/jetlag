import { describe, expect, it } from "vitest";
import { shouldPublishLocationNow } from "./locationPublishPolicy";

describe("shouldPublishLocationNow", () => {
  it("holds the reading when offline with an unacked write", () => {
    expect(
      shouldPublishLocationNow({
        effectivelyOffline: true,
        hasUnackedLocationWrite: true,
      }),
    ).toBe(false);
  });

  it("publishes when offline with nothing in flight", () => {
    expect(
      shouldPublishLocationNow({
        effectivelyOffline: true,
        hasUnackedLocationWrite: false,
      }),
    ).toBe(true);
  });

  it("publishes when online even with an unacked write", () => {
    expect(
      shouldPublishLocationNow({
        effectivelyOffline: false,
        hasUnackedLocationWrite: true,
      }),
    ).toBe(true);
  });
});
